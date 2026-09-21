const assert = require("assert");
const test = require("node:test");
const { LeaseStore } = require("../packages/coordination/src/leases.js");

class FakeClock {
  value = 1_700_000_000_000;
  nowMs() { return this.value; }
  advance(ms) { this.value += ms; }
}

test("lease acquisition grants a single owner and a second owner sees busy", () => {
  const clock = new FakeClock();
  const store = new LeaseStore(clock);

  const first = store.acquire("work-1", "worker-a", 1000);
  assert.equal(first.status, "acquired");
  const second = store.acquire("work-1", "worker-b", 1000);
  assert.equal(second.status, "busy");
  assert.equal(second.lease.ownerId, "worker-a");
});

test("same owner acquisition renews instead of creating duplicate ownership", () => {
  const clock = new FakeClock();
  const store = new LeaseStore(clock);

  const first = store.acquire("work-1", "worker-a", 1000);
  clock.advance(400);
  const renewed = store.acquire("work-1", "worker-a", 2000);

  assert.equal(renewed.status, "renewed");
  assert.equal(renewed.lease.leaseId, first.lease.leaseId);
  assert.equal(renewed.lease.revision, 2);
  assert.equal(Date.parse(renewed.lease.expiresAt), clock.nowMs() + 2000);
});

test("expired leases can be acquired by a new owner", () => {
  const clock = new FakeClock();
  const store = new LeaseStore(clock);

  const first = store.acquire("work-1", "worker-a", 1000);
  clock.advance(1000);
  const second = store.acquire("work-1", "worker-b", 1000);

  assert.equal(second.status, "acquired");
  assert.notEqual(second.lease.leaseId, first.lease.leaseId);
  assert.equal(second.lease.ownerId, "worker-b");
});

test("renew requires exact lease identity and owner", () => {
  const clock = new FakeClock();
  const store = new LeaseStore(clock);
  const acquired = store.acquire("work-1", "worker-a", 1000);
  assert.throws(() => store.renew("work-1", acquired.lease.leaseId, "worker-b", 1000), /ownership mismatch/);
  assert.throws(() => store.renew("work-1", "wrong", "worker-a", 1000), /ownership mismatch/);
});

test("release is owner-bound and idempotent for a missing lease", () => {
  const store = new LeaseStore(new FakeClock());
  const acquired = store.acquire("work-1", "worker-a", 1000);
  assert.throws(() => store.release("work-1", acquired.lease.leaseId, "worker-b"), /ownership mismatch/);
  assert.equal(store.release("work-1", acquired.lease.leaseId, "worker-a"), true);
  assert.equal(store.release("work-1", acquired.lease.leaseId, "worker-a"), false);
});

test("reapExpired removes only expired leases and returns deterministic records", () => {
  const clock = new FakeClock();
  const store = new LeaseStore(clock);
  store.acquire("work-b", "worker-b", 1000);
  store.acquire("work-a", "worker-a", 2000);
  clock.advance(1000);

  const expired = store.reapExpired();
  assert.equal(expired.length, 1);
  assert.equal(expired[0].resourceId, "work-b");
  assert.equal(store.get("work-b"), null);
  assert.ok(store.get("work-a"));
});

test("worker registration deduplicates capabilities and heartbeat controls state", () => {
  const clock = new FakeClock();
  const store = new LeaseStore(clock);
  const worker = store.registerWorker({ workerId: "worker-a", capabilities: ["github.read", "github.read", "browser"] });
  assert.deepEqual(worker.capabilities, ["browser", "github.read"]);

  clock.advance(500);
  assert.equal(store.markWorkerOffline("worker-a").state, "offline");
  assert.equal(store.heartbeat("worker-a").state, "active");
  assert.equal(store.getWorker("worker-a").lastHeartbeatAt, new Date(clock.nowMs()).toISOString());
});

test("assertOwned rejects expired or foreign leases", () => {
  const clock = new FakeClock();
  const store = new LeaseStore(clock);
  const acquired = store.acquire("work-1", "worker-a", 1000);
  assert.equal(store.assertOwned("work-1", acquired.lease.leaseId, "worker-a").ownerId, "worker-a");
  assert.throws(() => store.assertOwned("work-1", acquired.lease.leaseId, "worker-b"), /not currently owned/);
  clock.advance(1000);
  assert.throws(() => store.assertOwned("work-1", acquired.lease.leaseId, "worker-a"), /not currently owned/);
});

export {};
