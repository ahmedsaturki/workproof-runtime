const assert = require("assert");
const test = require("node:test");
const { WorkStore } = require("../packages/core/src/work.js");
const { CapabilityRegistry } = require("../packages/capabilities/src/registry.js");
const { executeCompensation } = require("../packages/compensation/src/engine.js");
const { JsonWorkRepository } = require("../packages/storage/src/json.js");
const { buildProofBundle } = require("../packages/evidence/src/bundle.js");

function fixture() {
  const store = new WorkStore();
  const registry = new CapabilityRegistry();
  const work = store.create({ objective: "saga", success: [], deliverables: [], riskClass: "external_write" });
  const one = store.addEffect(work, "writer", "external_write", "forward:1", "write");
  const two = store.addEffect(work, "writer", "external_write", "forward:2", "write");
  one.status = "acknowledged"; two.status = "acknowledged";
  const saga = store.createSaga(work, [one.effectId, two.effectId]);
  return { store, registry, work, one, two, saga };
}

test("compensation is explicit, linked, independently verified, and replay-safe", async () => {
  const { store, registry, work, one, two, saga } = fixture();
  const state = new Set(["A","B"]);
  let calls = 0;
  registry.register({ name: "undo", version: "1", operations: ["undo"], riskClass: "external_write",
    execute: async (request: any) => { calls++; state.delete(String(request.input)); return { status: "accepted", externalEffectId: "undo:" + request.input }; } });

  const first = await executeCompensation({ store, registry, work,
    request: { sagaId: saga.sagaId, sourceEffectId: one.effectId, operation: "undo", input: "A", idempotencyKey: "comp:A", capability: "undo", riskClass: "external_write" },
    verifyExternalState: async (_work: any, _effect: any) => !state.has("A") });
  assert.equal(first.status, "partial");
  assert.equal(work.sagas[0].status, "partial");
  const comp = work.effects.find((e: any) => e.sourceEffectId === one.effectId);
  assert.ok(comp); assert.equal(comp.kind, "compensation"); assert.equal(comp.status, "verified");

  const second = await executeCompensation({ store, registry, work,
    request: { sagaId: saga.sagaId, sourceEffectId: two.effectId, operation: "undo", input: "B", idempotencyKey: "comp:B", capability: "undo", riskClass: "external_write" },
    verifyExternalState: async (_work: any, _effect: any) => !state.has("B") });
  assert.equal(second.status, "compensated");
  assert.equal(work.sagas[0].status, "compensated");
  assert.equal(calls, 2);

  const replay = await executeCompensation({ store, registry, work,
    request: { sagaId: saga.sagaId, sourceEffectId: two.effectId, operation: "undo", input: "B", idempotencyKey: "comp:B", capability: "undo", riskClass: "external_write" },
    verifyExternalState: async () => true });
  assert.equal(replay.status, "compensated");
  assert.equal(calls, 2);

  const proof = buildProofBundle(work);
  assert.equal((proof).sagas.length, 1);
  assert.equal((proof).sagas[0].compensationEffectIds.length, 2);
  assert.ok((proof).effects.some(e => e.sourceEffectId === one.effectId));
});

test("lost compensation acknowledgement reconciles without duplicate write", async () => {
  const { store, registry, work, one, saga } = fixture();
  const state = new Set(["A"]); let calls = 0;
  registry.register({ name: "flaky.undo", version: "1", operations: ["undo"], riskClass: "external_write",
    execute: async () => { calls++; state.delete("A"); return { status: calls === 1 ? "ambiguous" : "accepted" }; } });
  const result = await executeCompensation({ store, registry, work,
    request: { sagaId: saga.sagaId, sourceEffectId: one.effectId, operation: "undo", input: "A", idempotencyKey: "comp:lost", capability: "flaky.undo", riskClass: "external_write", maxAttempts: 3 },
    verifyExternalState: async () => !state.has("A") });
  assert.equal(result.status, "compensated");
  assert.equal(calls, 1);
});

test("compensation policy blocks before execution", async () => {
  const { store, registry, work, one, saga } = fixture();
  let calls = 0;
  registry.register({ name: "blocked", version: "1", operations: ["undo"], riskClass: "external_write", execute: async () => { calls++; return { status: "accepted" }; } });
  const result = await executeCompensation({ store, registry, work,
    request: { sagaId: saga.sagaId, sourceEffectId: one.effectId, operation: "undo", input: "A", idempotencyKey: "comp:block", capability: "blocked", riskClass: "external_write" },
    policy: { maxRisk: "external_write", approvalRequiredAbove: "external_write", approved: false },
    verifyExternalState: async () => false });
  assert.equal(result.status, "blocked"); assert.equal(calls, 0); assert.equal(work.sagas[0].status, "unresolved");
});

test("persisted verified compensation is not replayed", async () => {
  const { store, registry, work, one, saga } = fixture();
  const repo = new JsonWorkRepository("/tmp/workproof-saga-repo"); let calls = 0;
  const cap = { name: "persist.undo", version: "1", operations: ["undo"], riskClass: "external_write",
    execute: async () => { calls++; return { status: "accepted" }; } };
  registry.register(cap);
  await executeCompensation({ store, registry, work,
    request: { sagaId: saga.sagaId, sourceEffectId: one.effectId, operation: "undo", input: "A", idempotencyKey: "comp:persist", capability: cap.name, riskClass: "external_write" },
    verifyExternalState: async () => true, persist: (value: any) => repo.save(value) });
  assert.equal(calls, 1);
  const loaded = repo.load(work.id); const resumedStore = new WorkStore(); const resumedRegistry = new CapabilityRegistry();
  resumedStore.register(loaded); resumedRegistry.register(cap);
  const replay = await executeCompensation({ store: resumedStore, registry: resumedRegistry, work: loaded,
    request: { sagaId: saga.sagaId, sourceEffectId: one.effectId, operation: "undo", input: "A", idempotencyKey: "comp:persist", capability: cap.name, riskClass: "external_write" },
    verifyExternalState: async () => true });
  assert.equal(replay.status, "partial"); assert.equal(calls, 1);
});

export {};
