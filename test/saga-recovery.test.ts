const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const path = require("path");
const { WorkStore } = require("../packages/core/src/work.js");
const { CapabilityRegistry } = require("../packages/capabilities/src/registry.js");
const { executeCompensation } = require("../packages/compensation/src/engine.js");
const { SagaRecoveryCoordinator } = require("../packages/compensation/src/recovery.js");
const { PersistentLeaseStore } = require("../packages/coordination/src/persistent.js");
const { JsonWorkRepository } = require("../packages/storage/src/json.js");
const { EffectRecord, Capability } = require("../packages/core/src/types.js");

class FakeClock {
  private value: number;
  constructor(value: number = 1_800_000_000_000) { this.value = value; }
  nowMs(): number { return this.value; }
  advance(ms: number): void { this.value += ms; }
}

function fixture(dir: string) {
  const store = new WorkStore();
  const registry = new CapabilityRegistry();
  const work = store.create({
    objective: "durable saga recovery",
    success: [],
    deliverables: [],
    riskClass: "external_write"
  });
  const first = store.addEffect(work, "writer", "external_write", "forward:A", "write");
  const second = store.addEffect(work, "writer", "external_write", "forward:B", "write");
  first.status = "acknowledged";
  second.status = "acknowledged";
  const saga = store.createSaga(work, [first.effectId, second.effectId]);
  const repo = new JsonWorkRepository(path.join(dir, "work"));
  return { store, registry, work, first, second, saga, repo };
}

test("replacement worker recovers a partial saga without replaying verified compensation", async () => {
  const dir = fs.mkdtempSync("/tmp/workproof-v19-saga-");
  const clock = new FakeClock();
  const leases = new PersistentLeaseStore(path.join(dir, "leases.db"), { clock });
  const { store, registry, work, first, second, saga, repo } = fixture(dir);
  const state = new Set(["A", "B"]);
  let calls = 0;

  const cap: Capability = {
    name: "undo",
    version: "1",
    operations: ["undo"],
    riskClass: "external_write",
    execute: async (request) => {
      calls++;
      state.delete(String(request.input));
      return { status: "accepted", externalEffectId: "undo:" + String(request.input) };
    }
  };
  registry.register(cap);

  await executeCompensation({
    store,
    registry,
    work,
    request: {
      sagaId: saga.sagaId,
      sourceEffectId: first.effectId,
      operation: "undo",
      input: "A",
      idempotencyKey: "comp:A",
      capability: cap.name,
      riskClass: "external_write"
    },
    verifyExternalState: async (_work: any, _effect: EffectRecord) => !state.has("A"),
    persist: (value: any) => repo.save(value)
  });
  assert.equal(work.sagas?.[0].status, "partial");
  repo.save(work);

  const resourceId = `work:${work.id}:saga:${saga.sagaId}`;
  const oldLease = leases.acquire(resourceId, "lost-worker", 100);
  assert.equal(oldLease.status, "acquired");
  clock.advance(101);

  const replacementStore = new WorkStore();
  const replacementRegistry = new CapabilityRegistry();
  replacementRegistry.register(cap);
  const coordinator = new SagaRecoveryCoordinator(repo, replacementStore, replacementRegistry, leases);
  const result = await coordinator.recover({
    workId: work.id,
    sagaId: saga.sagaId,
    ownerId: "replacement-worker",
    ttlMs: 100,
    planForSourceEffect: (source: EffectRecord) => ({
      sagaId: saga.sagaId,
      sourceEffectId: source.effectId,
      operation: "undo",
      input: "B",
      idempotencyKey: "comp:B",
      capability: cap.name,
      riskClass: "external_write"
    }),
    verifyExternalState: async (_work: any, effect: EffectRecord) => !state.has(effect.sourceEffectId === second.effectId ? "B" : "A")
  });

  assert.equal(result.status, "compensated");
  assert.equal(calls, 2);
  assert.equal(result.skippedVerifiedEffectIds.length, 1);
  assert.equal(state.has("A"), false);
  assert.equal(state.has("B"), false);
  assert.equal(leases.get(resourceId), null);

  leases.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test("recovery reconciles a persisted ambiguous compensation before another write", async () => {
  const dir = fs.mkdtempSync("/tmp/workproof-v19-ambiguous-");
  const clock = new FakeClock();
  const leases = new PersistentLeaseStore(path.join(dir, "leases.db"), { clock });
  const { store, registry, work, second, saga, repo } = fixture(dir);
  const state = new Set(["A", "B"]);
  let replacementCalls = 0;

  const cap: Capability = {
    name: "undo.ambiguous",
    version: "1",
    operations: ["undo"],
    riskClass: "external_write",
    execute: async () => {
      throw new Error("original capability must not be called");
    }
  };
  registry.register(cap);

  const ambiguous = store.addCompensationEffect(
    work,
    saga.sagaId,
    second.effectId,
    cap.name,
    "external_write",
    "comp:ambiguous",
    "undo"
  );
  ambiguous.status = "unknown";
  ambiguous.attempts = 1;
  repo.save(work);

  const resourceId = `work:${work.id}:saga:${saga.sagaId}`;
  const old = leases.acquire(resourceId, "lost-worker", 100);
  assert.equal(old.status, "acquired");
  clock.advance(101);

  const replacementStore = new WorkStore();
  const replacementRegistry = new CapabilityRegistry();
  replacementRegistry.register({
    ...cap,
    execute: async () => {
      replacementCalls++;
      throw new Error("must not write after reconciliation");
    }
  });

  const coordinator = new SagaRecoveryCoordinator(repo, replacementStore, replacementRegistry, leases);
  const result = await coordinator.recover({
    workId: work.id,
    sagaId: saga.sagaId,
    ownerId: "replacement-worker",
    ttlMs: 100,
    planForSourceEffect: (source: EffectRecord) => ({
      sagaId: saga.sagaId,
      sourceEffectId: source.effectId,
      operation: "undo",
      input: "B",
      idempotencyKey: "comp:ambiguous",
      capability: cap.name,
      riskClass: "external_write"
    }),
    verifyExternalState: async () => state.has("B") === false
  });

  assert.equal(result.status, "compensated");
  assert.equal(replacementCalls, 0);
  const loaded = repo.load(work.id);
  const loadedCompensation = loaded.effects.find((effect: EffectRecord) => effect.effectId === ambiguous.effectId);
  assert.equal(loadedCompensation?.status, "verified");
  assert.equal(loaded.sagas?.[0].status, "compensated");

  leases.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test("stale saga recovery owner cannot continue after a replacement worker acquires the lease", () => {
  const dir = fs.mkdtempSync("/tmp/workproof-v19-stale-");
  const clock = new FakeClock();
  const leases = new PersistentLeaseStore(path.join(dir, "leases.db"), { clock });
  const resourceId = "work:work1:saga:saga1";
  const old = leases.acquire(resourceId, "worker-old", 100);
  assert.equal(old.status, "acquired");
  clock.advance(101);
  const replacement = leases.acquire(resourceId, "worker-new", 100);
  assert.equal(replacement.status, "acquired");
  assert.throws(
    () => leases.assertOwned(resourceId, old.lease.leaseId, "worker-old"),
    /Lease is not currently owned by caller/
  );
  assert.equal(leases.get(resourceId)?.ownerId, "worker-new");
  leases.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

export {};
