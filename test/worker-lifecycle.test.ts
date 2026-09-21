const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");

import { LeaseClock, LeaseStore, WorkerStatus } from "../packages/coordination/src/leases";
import { PersistentLeaseStore } from "../packages/coordination/src/persistent";
import { startControlPlane } from "../packages/control-plane/src/http";

class FakeClock implements LeaseClock {
  constructor(public value = 1_700_000_000_000) {}
  nowMs(): number { return this.value; }
  advance(ms: number): void { this.value += ms; }
}

function tempDb(): { dir: string; db: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "workproof-worker-life-"));
  return { dir, db: path.join(dir, "workers.db") };
}

function getJson(port: number, pathName: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, path: pathName, method: "GET" }, (res: any) => {
      const chunks: string[] = [];
      res.setEncoding("utf8");
      res.on("data", (chunk: string) => chunks.push(chunk));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(chunks.join("")) }); }
        catch (error) { reject(error); }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

test("worker liveness distinguishes active, stale, and offline", () => {
  const clock = new FakeClock();
  const store = new LeaseStore(clock);
  store.registerWorker({ workerId: "worker-a", capabilities: ["github.read"] });
  assert.equal(store.getWorkerStatus("worker-a", 1000)?.liveness, "active");
  clock.advance(1001);
  const stale = store.getWorkerStatus("worker-a", 1000) as WorkerStatus;
  assert.equal(stale.liveness, "stale");
  assert.equal(stale.reassignmentEligible, true);
  assert.equal(stale.heartbeatAgeMs, 1001);
  store.heartbeat("worker-a");
  assert.equal(store.getWorkerStatus("worker-a", 1000)?.liveness, "active");
  store.markWorkerOffline("worker-a");
  assert.equal(store.getWorkerStatus("worker-a", 1000)?.liveness, "offline");
});

test("reassignment eligibility never bypasses an active authoritative lease", () => {
  const clock = new FakeClock();
  const store = new LeaseStore(clock);
  store.registerWorker({ workerId: "worker-old", capabilities: ["test"] });
  clock.advance(2000);
  const held = store.acquire("resource-1", "worker-old", 5000);
  assert.equal(held.status, "acquired");
  assert.equal(store.checkReassignment("resource-1", "worker-old", 1000).reason, "lease-active");
  clock.advance(5000);
  assert.equal(store.checkReassignment("resource-1", "worker-old", 1000).eligible, true);
  const takeover = store.acquire("resource-1", "worker-new", 5000);
  assert.equal(takeover.status, "acquired");
  assert.equal(store.assertOwned("resource-1", takeover.lease.leaseId, "worker-new").ownerId, "worker-new");
});

test("persistent worker liveness survives reopen and stale state never overrides a live lease", () => {
  const { dir, db } = tempDb();
  const clock = new FakeClock();
  const store = new PersistentLeaseStore(db, { clock });
  store.registerWorker({ workerId: "worker-a", capabilities: ["a"], metadata: { zone: "1" } });
  clock.advance(1500);
  assert.equal(store.getWorkerStatus("worker-a", 1000)?.liveness, "stale");
  const held = store.acquire("resource-2", "worker-a", 1000);
  assert.equal(held.status, "acquired");
  assert.equal(store.checkReassignment("resource-2", "worker-a", 1000).eligible, false);
  store.close();

  const reopened = new PersistentLeaseStore(db, { clock });
  assert.equal(reopened.getWorkerStatus("worker-a", 1000)?.metadata?.zone, "1");
  clock.advance(1000);
  assert.equal(reopened.checkReassignment("resource-2", "worker-a", 1000).eligible, true);
  reopened.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test("control plane exposes worker liveness read-only and fails closed when unconfigured", async () => {
  const store = new LeaseStore(new FakeClock());
  store.registerWorker({ workerId: "worker-http", capabilities: ["github.read"] });
  const repository = {
    load: () => { throw new Error("not used"); },
    save: () => "unused"
  };
  const configured = await startControlPlane({
    repository,
    workerStatusSource: store,
    workerStaleAfterMs: 500
  });
  const response = await getJson(configured.port, "/v1/workers");
  assert.equal(response.status, 200);
  assert.equal(response.body.version, "1.1");
  assert.equal(response.body.staleAfterMs, 500);
  assert.equal(response.body.workers[0].workerId, "worker-http");
  assert.equal(response.body.workers[0].liveness, "active");
  await configured.close();

  const unconfigured = await startControlPlane({ repository });
  const missing = await getJson(unconfigured.port, "/v1/workers");
  assert.equal(missing.status, 503);
  assert.equal(missing.body.error, "worker-status-not-configured");
  await unconfigured.close();
});

export {};
