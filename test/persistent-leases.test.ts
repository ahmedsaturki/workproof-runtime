const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { fork } = require("child_process");
const { PersistentLeaseStore } = require("../packages/coordination/src/persistent.js");

class FakeClock {
  constructor(value = 1_700_000_000_000) {
    this.value = value;
  }
  nowMs() {
    return this.value;
  }
  advance(ms) {
    this.value += ms;
  }
}

function tempDb(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return { dir, db: path.join(dir, "leases.db") };
}

function startWorker(db, workerId, resourceId, ttlMs) {
  const script = path.resolve("dist/apps/lease-worker.js");
  const child = fork(script, [db, workerId, resourceId, String(ttlMs)], {
    stdio: ["ignore", "pipe", "pipe", "ipc"]
  });
  const ready = new Promise((resolve, reject) => {
    const onMessage = (message) => {
      if (message?.type === "ready") {
        child.off("message", onMessage);
        resolve();
      }
      if (message?.type === "error") reject(new Error(String(message.error)));
    };
    child.on("message", onMessage);
    child.once("error", reject);
  });
  return { child, ready };
}

function awaitResult(handle) {
  return new Promise((resolve, reject) => {
    const onMessage = (message) => {
      if (message?.type === "result") {
        handle.child.off("message", onMessage);
        resolve(message);
      } else if (message?.type === "error") {
        reject(new Error(String(message.error)));
      }
    };
    handle.child.on("message", onMessage);
    handle.child.once("error", reject);
  });
}

test("persistent lease state survives reopening and preserves owner identity", () => {
  const { dir, db } = tempDb("workproof-persistent-lease-");
  const clock = new FakeClock();
  const first = new PersistentLeaseStore(db, { clock });
  const acquired = first.acquire("work-1", "worker-a", 1000);
  assert.equal(acquired.status, "acquired");
  first.registerWorker({ workerId: "worker-a", capabilities: ["github.read", "github.read"] });
  first.close();

  const reopened = new PersistentLeaseStore(db, { clock });
  const restored = reopened.get("work-1");
  assert.equal(restored.leaseId, acquired.lease.leaseId);
  assert.equal(restored.ownerId, "worker-a");
  const renewed = reopened.acquire("work-1", "worker-a", 2000);
  assert.equal(renewed.status, "renewed");
  assert.equal(renewed.result.lease.leaseId, acquired.lease.leaseId);
  assert.equal(renewed.result.lease.revision, 2);
  assert.deepEqual(reopened.getWorker("worker-a").capabilities, ["github.read"]);
  reopened.close();

  const check = new PersistentLeaseStore(db, { clock });
  clock.advance(3000);
  assert.equal(check.get("work-1"), null);
  assert.equal(check.acquire("work-1", "worker-b", 1000).status, "acquired");
  check.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test("two independent Node processes cannot both acquire the same persistent lease", async () => {
  const { dir, db } = tempDb("workproof-cross-process-");
  const workerA = startWorker(db, "worker-a", "shared-work", 60_000);
  const workerB = startWorker(db, "worker-b", "shared-work", 60_000);

  try {
    await Promise.all([workerA.ready, workerB.ready]);
    const resultA = awaitResult(workerA);
    const resultB = awaitResult(workerB);
    workerA.child.send("go");
    workerB.child.send("go");
    const results = await Promise.all([resultA, resultB]);

    const acquired = results.filter((item) => item.result.status === "acquired");
    const busy = results.filter((item) => item.result.status === "busy");
    assert.equal(acquired.length, 1);
    assert.equal(busy.length, 1);
    assert.notEqual(acquired[0].workerId, busy[0].workerId);

    const store = new PersistentLeaseStore(db);
    const persisted = store.get("shared-work");
    assert.ok(persisted);
    assert.equal(persisted.ownerId, acquired[0].workerId);

    const winner = startWorker(db, acquired[0].workerId, "shared-work", 60_000);
    try {
      await winner.ready;
      const renewal = awaitResult(winner);
      winner.child.send("go");
      const renewed = await renewal;
      assert.equal(renewed.result.status, "renewed");
      assert.equal(renewed.result.lease.leaseId, persisted.leaseId);
      assert.equal(renewed.result.lease.revision, 2);
    } finally {
      if (winner.child.connected) winner.child.kill();
    }
    store.close();
  } finally {
    if (workerA.child.connected) workerA.child.kill();
    if (workerB.child.connected) workerB.child.kill();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("persistent workers preserve metadata, heartbeat state, and deterministic listing", () => {
  const { dir, db } = tempDb("workproof-persistent-worker-");
  const clock = new FakeClock();
  const store = new PersistentLeaseStore(db, { clock });
  store.registerWorker({ workerId: "worker-b", capabilities: ["browser", "browser"], metadata: { zone: "b" } });
  store.registerWorker({ workerId: "worker-a", capabilities: ["github.read"], metadata: { zone: "a" } });
  clock.advance(500);
  assert.equal(store.markWorkerOffline("worker-a").state, "offline");
  assert.equal(store.heartbeat("worker-a").state, "active");
  assert.deepEqual(store.listWorkers().map((worker) => worker.workerId), ["worker-a", "worker-b"]);
  assert.equal(store.getWorker("worker-a").metadata.zone, "a");
  store.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

export {};
