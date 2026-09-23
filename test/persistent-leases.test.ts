const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const os = require("os");
const path = require("path");

function tempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function removeTempDir(dir: string): void {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      return;
    } catch (error: any) {
      const retriable = error && (error.code === "EPERM" || error.code === "EBUSY" || error.code === "ENOTEMPTY");
      if (!retriable || attempt === 5) throw error;
      const end = Date.now() + 50;
      while (Date.now() < end) { /* brief backoff for Windows handle release */ }
    }
  }
}
const { fork } = require("child_process");

import type { LeaseAcquireResult, LeaseClock, LeaseRecord, WorkerRecord } from "../packages/coordination/src/leases";
import type { PersistentLeaseStore as PersistentLeaseStoreType } from "../packages/coordination/src/persistent";

const PersistentLeaseStore = require("../packages/coordination/src/persistent.js")
  .PersistentLeaseStore as new (dbPath: string, options?: { clock?: LeaseClock; timeoutMs?: number }) => PersistentLeaseStoreType;

interface WorkerReadyMessage {
  type: "ready";
  workerId: string;
}

interface WorkerResultMessage {
  type: "result";
  workerId: string;
  result: LeaseAcquireResult;
}

interface WorkerErrorMessage {
  type: "error";
  workerId: string;
  error: string;
}

type WorkerMessage = WorkerReadyMessage | WorkerResultMessage | WorkerErrorMessage;

interface WorkerChild {
  connected: boolean;
  on(event: "message", listener: (message: WorkerMessage) => void): WorkerChild;
  off(event: "message", listener: (message: WorkerMessage) => void): WorkerChild;
  once(event: "error", listener: (error: Error) => void): WorkerChild;
  send(message: string): void;
  kill(): boolean;
  once(event: "exit", listener: (code: number | null, signal: string | null) => void): WorkerChild;
}

interface WorkerHandle {
  child: WorkerChild;
  ready: Promise<void>;
}

class FakeClock implements LeaseClock {
  value: number;

  constructor(value: number = 1_700_000_000_000) {
    this.value = value;
  }

  nowMs(): number {
    return this.value;
  }

  advance(ms: number): void {
    this.value += ms;
  }
}

function tempDb(prefix: string): { dir: string; db: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return { dir, db: path.join(dir, "leases.db") };
}

function startWorker(db: string, workerId: string, resourceId: string, ttlMs: number): WorkerHandle {
  const script = path.resolve("dist/apps/lease-worker.js");
  const child = fork(script, [db, workerId, resourceId, String(ttlMs)], {
    stdio: ["ignore", "pipe", "pipe", "ipc"]
  }) as unknown as WorkerChild;

  const ready = new Promise<void>((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(`Worker ${workerId} did not become ready within 10000ms`));
      if (child.connected) child.kill();
    }, 10_000);

    const onMessage = (message: WorkerMessage): void => {
      if (message.type === "ready") {
        child.off("message", onMessage);
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          resolve();
        }
      } else if (message.type === "error" && !settled) {
        settled = true;
        clearTimeout(timeout);
        reject(new Error(message.error));
      }
    };

    child.on("message", onMessage);
    child.once("error", (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });
    child.once("exit", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(new Error(`Worker ${workerId} exited before ready (code=${code ?? "null"}, signal=${signal ?? "null"})`));
    });
  });

  return { child, ready };
}

function awaitResult(handle: WorkerHandle): Promise<WorkerResultMessage> {
  return new Promise<WorkerResultMessage>((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error("Worker did not return an acquisition result within 10000ms"));
      if (handle.child.connected) handle.child.kill();
    }, 10_000);

    const onMessage = (message: WorkerMessage): void => {
      if (message.type === "result") {
        handle.child.off("message", onMessage);
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          resolve(message);
        }
      } else if (message.type === "error" && !settled) {
        settled = true;
        clearTimeout(timeout);
        reject(new Error(message.error));
      }
    };

    handle.child.on("message", onMessage);
    handle.child.once("error", (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });
    handle.child.once("exit", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(new Error(`Worker exited before result (code=${code ?? "null"}, signal=${signal ?? "null"})`));
    });
  });
}

test("persistent lease state survives reopening and preserves owner identity", () => {
  const { dir, db } = tempDb("workproof-persistent-lease-");
  const clock = new FakeClock();
  const first = new PersistentLeaseStore(db, { clock });
  const acquired = first.acquire("work-1", "worker-a", 1000);
  assert.equal(acquired.status, "acquired");
  assert.equal(acquired.lease.ownerId, "worker-a");
  first.registerWorker({ workerId: "worker-a", capabilities: ["github.read", "github.read"] });
  first.close();

  const reopened = new PersistentLeaseStore(db, { clock });
  const restored = reopened.get("work-1");
  assert.ok(restored);
  assert.equal((restored as LeaseRecord).leaseId, acquired.lease.leaseId);
  assert.equal((restored as LeaseRecord).ownerId, "worker-a");

  const renewed = reopened.acquire("work-1", "worker-a", 2000);
  assert.equal(renewed.status, "renewed");
  assert.equal(renewed.lease.leaseId, acquired.lease.leaseId);
  assert.equal(renewed.lease.revision, 2);

  const worker = reopened.getWorker("worker-a");
  assert.ok(worker);
  assert.deepEqual((worker as WorkerRecord).capabilities, ["github.read"]);
  reopened.close();

  const check = new PersistentLeaseStore(db, { clock });
  clock.advance(3000);
  assert.equal(check.get("work-1"), null);
  assert.equal(check.acquire("work-1", "worker-b", 1000).status, "acquired");
  check.close();
  removeTempDir(dir);
});

test("six independent Node processes cannot both acquire the same persistent lease", async () => {
  const { dir, db } = tempDb("workproof-cross-process-");
  const workers: WorkerHandle[] = [];

  try {
    for (let index = 0; index < 6; index += 1) {
      const worker = startWorker(db, `worker-${String.fromCharCode(97 + index)}`, "shared-work", 60_000);
      workers.push(worker);
      await worker.ready;
    }
    const resultPromises = workers.map((worker: WorkerHandle) => awaitResult(worker));
    for (const worker of workers) worker.child.send("go");
    const results: WorkerResultMessage[] = await Promise.all(resultPromises);

    const acquired = results.filter((item: WorkerResultMessage) => item.result.status === "acquired");
    const busy = results.filter((item: WorkerResultMessage) => item.result.status === "busy");
    assert.equal(acquired.length, 1);
    assert.equal(busy.length, 5);
    assert.equal(new Set(results.map((item: WorkerResultMessage) => item.workerId)).size, 6);

    const store = new PersistentLeaseStore(db);
    const persisted = store.get("shared-work");
    assert.ok(persisted);
    assert.equal((persisted as LeaseRecord).ownerId, acquired[0].workerId);

    const winner = startWorker(db, acquired[0].workerId, "shared-work", 60_000);
    try {
      await winner.ready;
      const renewalPromise = awaitResult(winner);
      winner.child.send("go");
      const renewed: WorkerResultMessage = await renewalPromise;
      assert.equal(renewed.result.status, "renewed");
      assert.equal(renewed.result.lease.leaseId, (persisted as LeaseRecord).leaseId);
      assert.equal(renewed.result.lease.revision, 2);
    } finally {
      if (winner.child.connected) winner.child.kill();
    }
    store.close();
  } finally {
    for (const worker of workers) {
      if (worker.child.connected) worker.child.kill();
    }
    removeTempDir(dir);
  }
});

test("persistent workers preserve metadata, heartbeat state, and deterministic listing", () => {
  const { dir, db } = tempDb("workproof-persistent-worker-");
  const clock = new FakeClock();
  const store = new PersistentLeaseStore(db, { clock });

  store.registerWorker({
    workerId: "worker-b",
    capabilities: ["browser", "browser"],
    metadata: { zone: "b" }
  });
  store.registerWorker({
    workerId: "worker-a",
    capabilities: ["github.read"],
    metadata: { zone: "a" }
  });

  clock.advance(500);
  assert.equal(store.markWorkerOffline("worker-a").state, "offline");
  assert.equal(store.heartbeat("worker-a").state, "active");
  assert.deepEqual(store.listWorkers().map((worker: WorkerRecord) => worker.workerId), ["worker-a", "worker-b"]);

  const worker = store.getWorker("worker-a");
  assert.ok(worker);
  assert.equal((worker as WorkerRecord).metadata?.zone, "a");

  store.close();
  removeTempDir(dir);
});

export {};


test("PersistentLeaseStore exposes the same sanitized lease visibility contract as in-memory LeaseStore", () => {
  const root = tempDir("workproof-persistent-lease-visibility-");
  const dbPath = path.join(root, "leases.db");
  const leases = new PersistentLeaseStore(dbPath);
  try {
    const acquired = leases.acquire("work:persistent:step:1", "worker-persistent", 10_000);
    assert.equal(acquired.status, "acquired");
    const statuses = leases.listLeaseStatuses();
    assert.equal(statuses.length, 1);
    assert.equal(statuses[0].resourceId, "work:persistent:step:1");
    assert.equal(statuses[0].ownerId, "worker-persistent");
    assert.equal(statuses[0].revision, 1);
    assert.equal(statuses[0].active, true);
    assert.equal((statuses[0] as any).token, undefined);
    assert.equal((statuses[0] as any).fencingToken, undefined);
  } finally {
    leases.close();
    removeTempDir(root);
  }
});
