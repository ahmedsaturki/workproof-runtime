const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const os = require("os");
const path = require("path");

import { WorkStore } from "../packages/core/src/work";
import { CapabilityRegistry } from "../packages/capabilities/src/registry";
import { PersistentLeaseStore } from "../packages/coordination/src/persistent";
import { JsonWorkRepository } from "../packages/storage/src/json";
import { SagaRecoveryCoordinator } from "../packages/runtime/src/saga-recovery";

import type { Capability, CapabilityRequest, EffectRecord, SagaRecord, WorkEvent, WorkObject } from "../packages/core/src/types";
import type { LeaseAcquireResult, LeaseClock } from "../packages/coordination/src/leases";

class FakeClock implements LeaseClock {
  constructor(public value: number = 1_700_000_000_000) {}
  nowMs(): number { return this.value; }
  advance(ms: number): void { this.value += ms; }
}

function tempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function fixture(): { store: WorkStore; registry: CapabilityRegistry; work: WorkObject; saga: SagaRecord; compA: EffectRecord; compB: EffectRecord } {
  const store = new WorkStore();
  const registry = new CapabilityRegistry();
  const work = store.create({
    objective: "recover partial saga after worker loss",
    success: [],
    deliverables: [],
    riskClass: "external_write"
  });
  const forwardA = store.addEffect(work, "writer", "external_write", "forward:A", "write");
  const forwardB = store.addEffect(work, "writer", "external_write", "forward:B", "write");
  forwardA.status = "acknowledged";
  forwardB.status = "acknowledged";
  const saga = store.createSaga(work, [forwardA.effectId, forwardB.effectId]);
  const compA = store.addCompensationEffect(
    work, saga.sagaId, forwardA.effectId, "undo", "external_write", "comp:A", "undo", "A"
  );
  const compB = store.addCompensationEffect(
    work, saga.sagaId, forwardB.effectId, "undo", "external_write", "comp:B", "undo", "B"
  );
  compA.status = "verified";
  store.updateSagaStatus(work, saga.sagaId);
  return { store, registry, work, saga, compA, compB };
}

function coordinator(repo: JsonWorkRepository, store: WorkStore, registry: CapabilityRegistry, leaseStore: PersistentLeaseStore, ownerId: string, ttlMs = 1000): SagaRecoveryCoordinator {
  return new SagaRecoveryCoordinator(repo, store, registry, {
    authority: leaseStore,
    ownerId,
    ttlMs,
    heartbeatIntervalMs: 10
  });
}

test("durable saga recovery skips verified compensation, acquires after worker loss, and executes pending work once", async () => {
  const dir = tempDir("workproof-saga-recovery-");
  const repo = new JsonWorkRepository(path.join(dir, "work"));
  const clock = new FakeClock();
  const leaseStore = new PersistentLeaseStore(path.join(dir, "leases.db"), { clock });
  const { store, registry, work, saga, compA, compB } = fixture();

  repo.save(work);
  const persisted = repo.load(work.id);
  assert.equal(persisted.sagas?.[0]?.status, "partial");
  assert.equal(persisted.effects.find((effect: EffectRecord) => effect.effectId === compA.effectId)?.status, "verified");
  assert.equal(persisted.effects.find((effect: EffectRecord) => effect.effectId === compB.effectId)?.status, "planned");

  const state = new Set(["B"]);
  let calls = 0;
  registry.register({
    name: "undo",
    version: "1.0.0",
    operations: ["undo"],
    riskClass: "external_write",
    execute: async (request: CapabilityRequest) => {
      calls += 1;
      state.delete(String(request.input));
      return { status: "accepted", externalEffectId: "undo:" + request.input };
    }
  });

  const resource = "saga:" + work.id + ":recovery:" + saga.sagaId;
  const oldLease = leaseStore.acquire(resource, "dead-worker", 1000);
  if (oldLease.status !== "acquired") throw new Error("Expected dead-worker lease to be acquired");
  clock.advance(1001);

  const recoveryStore = new WorkStore();
  const recovered = await coordinator(repo, recoveryStore, registry, leaseStore, "replacement-worker").recover({
    workId: work.id,
    sagaId: saga.sagaId,
    verifyExternalState: async (_work: WorkObject, effect: EffectRecord) => effect.input === "B" && !state.has("B")
  });

  assert.equal(recovered.status, "compensated");
  assert.deepEqual(recovered.completedCompensationEffectIds, [compB.effectId]);
  assert.deepEqual(recovered.skippedVerifiedEffectIds, [compA.effectId]);
  assert.equal(recovered.attemptsByEffectId[compB.effectId], 1);
  assert.equal(calls, 1);

  const after = repo.load(work.id);
  assert.equal(after.effects.find((effect: EffectRecord) => effect.effectId === compA.effectId)?.status, "verified");
  assert.equal(after.effects.find((effect: EffectRecord) => effect.effectId === compB.effectId)?.status, "verified");
  assert.equal(after.sagas?.[0]?.status, "compensated");
  assert.ok(after.events.some((event: WorkEvent) => event.type === "saga.recovery.started"));
  assert.ok(after.events.some((event: WorkEvent) => event.type === "saga.recovery.finished"));
  const recoveryStart = after.events.find((event: WorkEvent) => event.type === "saga.recovery.started");
  assert.deepEqual(recoveryStart?.data?.recoveredFromLeaseIds, [oldLease.lease.leaseId]);

  leaseStore.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test("ambiguous compensation acknowledgement reconciles before retry and performs one external execution", async () => {
  const dir = tempDir("workproof-saga-reconcile-");
  const repo = new JsonWorkRepository(path.join(dir, "work"));
  const clock = new FakeClock();
  const leaseStore = new PersistentLeaseStore(path.join(dir, "leases.db"), { clock });
  const { store, registry, work, saga, compA } = fixture();
  compA.status = "planned";
  store.updateSagaStatus(work, saga.sagaId);
  repo.save(work);

  const state = new Set(["A"]);
  let calls = 0;
  registry.register({
    name: "flaky.undo",
    version: "1.0.0",
    operations: ["undo"],
    riskClass: "external_write",
    execute: async () => {
      calls += 1;
      state.delete("A");
      return { status: calls === 1 ? "ambiguous" : "accepted" };
    }
  });

  const recovered = await coordinator(repo, new WorkStore(), registry, leaseStore, "replacement-worker").recover({
    workId: work.id,
    sagaId: saga.sagaId,
    maxAttempts: 3,
    verifyExternalState: async (_work, effect) => effect.input === "A" && !state.has("A")
  });

  assert.equal(recovered.status, "partial");
  assert.equal(calls, 1);
  assert.equal(recovered.attemptsByEffectId[compA.effectId], 1);

  leaseStore.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test("stale saga worker stops after ownership moves and replacement worker resumes pending compensation", async () => {
  const dir = tempDir("workproof-saga-stale-");
  const repo = new JsonWorkRepository(path.join(dir, "work"));
  const clock = new FakeClock();
  const leaseStore = new PersistentLeaseStore(path.join(dir, "leases.db"), { clock });
  const { store, registry, work, saga, compA, compB } = fixture();
  compA.status = "planned";
  store.updateSagaStatus(work, saga.sagaId);
  repo.save(work);

  const state = new Set(["A", "B"]);
  let calls = 0;
  const resource = "saga:" + work.id + ":recovery:" + saga.sagaId;
  registry.register({
    name: "handoff.undo",
    version: "1.0.0",
    operations: ["undo"],
    riskClass: "external_write",
    execute: async (request) => {
      calls += 1;
      const value = String(request.input);
      state.delete(value);
      if (value === "A") {
        clock.advance(1001);
        const takeover = leaseStore.acquire(resource, "replacement-worker", 1000);
        assert.equal(takeover.status, "acquired");
      }
      return { status: "accepted", externalEffectId: "undo:" + value };
    }
  });

  const stale = await coordinator(repo, new WorkStore(), registry, leaseStore, "dead-worker").recover({
    workId: work.id,
    sagaId: saga.sagaId,
    verifyExternalState: async (_work, effect) => !state.has(String(effect.input))
  });

  assert.equal(stale.status, "unresolved");
  assert.equal(calls, 1);
  assert.equal(stale.completedCompensationEffectIds.includes(compA.effectId), true);
  assert.equal(stale.completedCompensationEffectIds.includes(compB.effectId), false);

  const persistedAfterLoss = repo.load(work.id);
  assert.equal(persistedAfterLoss.effects.find((effect: EffectRecord) => effect.effectId === compA.effectId)?.status, "verified");
  assert.equal(persistedAfterLoss.effects.find((effect: EffectRecord) => effect.effectId === compB.effectId)?.status, "planned");
  assert.ok(persistedAfterLoss.events.some(event => event.type === "saga.recovery.lease_lost"));

  const replacement = await coordinator(repo, new WorkStore(), registry, leaseStore, "replacement-worker").recover({
    workId: work.id,
    sagaId: saga.sagaId,
    verifyExternalState: async (_work, effect) => !state.has(String(effect.input))
  });

  assert.equal(replacement.status, "compensated");
  assert.equal(calls, 2);
  assert.equal(replacement.attemptsByEffectId[compB.effectId], 1);

  leaseStore.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test("saga recovery refuses to execute when another owner still holds the recovery lease", async () => {
  const dir = tempDir("workproof-saga-busy-");
  const repo = new JsonWorkRepository(path.join(dir, "work"));
  const clock = new FakeClock();
  const leaseStore = new PersistentLeaseStore(path.join(dir, "leases.db"), { clock });
  const { store, registry, work, saga } = fixture();
  repo.save(work);

  let calls = 0;
  registry.register({
    name: "undo",
    version: "1.0.0",
    operations: ["undo"],
    riskClass: "external_write",
    execute: async () => {
      calls += 1;
      return { status: "accepted" };
    }
  });

  const resource = "saga:" + work.id + ":recovery:" + saga.sagaId;
  const held = leaseStore.acquire(resource, "live-worker", 10_000);
  if (held.status !== "acquired") throw new Error("Expected live-worker lease to be acquired");

  const result = await coordinator(repo, new WorkStore(), registry, leaseStore, "replacement-worker").recover({
    workId: work.id,
    sagaId: saga.sagaId,
    verifyExternalState: async () => false
  });

  assert.equal(result.status, "waiting_lease");
  assert.equal(calls, 0);
  assert.ok(repo.load(work.id).events.some((event: WorkEvent) => event.type === "saga.recovery.waiting_lease"));

  leaseStore.close();
  fs.rmSync(dir, { recursive: true, force: true });
});


test("saga recovery refuses corrupt persisted compensation lineage instead of reporting no work", async () => {
  const dir = tempDir("workproof-saga-invalid-");
  const repo = new JsonWorkRepository(path.join(dir, "work"));
  const clock = new FakeClock();
  const leaseStore = new PersistentLeaseStore(path.join(dir, "leases.db"), { clock });
  const { store, registry, work, saga } = fixture();

  saga.compensationEffectIds.push("missing-compensation-effect");
  repo.save(work);

  const result = await coordinator(repo, new WorkStore(), registry, leaseStore, "replacement-worker").recover({
    workId: work.id,
    sagaId: saga.sagaId,
    verifyExternalState: async () => false
  });

  assert.equal(result.status, "unresolved");
  assert.deepEqual(result.invalidCompensationEffectIds, ["missing-compensation-effect"]);
  assert.ok(repo.load(work.id).events.some((event: WorkEvent) => event.type === "saga.recovery.invalid_lineage"));

  leaseStore.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

export {};
