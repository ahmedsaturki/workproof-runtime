const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const os = require("os");
const path = require("path");

import { Capability, VerificationCheck, Verifier, WorkObject } from "../packages/core/src/types";
import { CapabilityRegistry } from "../packages/capabilities/src/registry";
import { WorkStore } from "../packages/core/src/work";
import { PersistentLeaseStore } from "../packages/coordination/src/persistent";
import { WorkEngine, WorkStep } from "../packages/runtime/src/engine";
import { WorkRecoveryCoordinator } from "../packages/runtime/src/recovery";
import { VerificationEngine } from "../packages/verification/src/engine";
import { JsonWorkRepository } from "../packages/storage/src/json";
import { LeaseClock } from "../packages/coordination/src/leases";

class FakeClock implements LeaseClock {
  constructor(public value = 1_700_000_000_000) {}
  nowMs(): number { return this.value; }
  advance(ms: number): void { this.value += ms; }
}

function tempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function makeWork(store: WorkStore): WorkObject {
  return store.create({
    objective: "recover persisted work",
    success: [{ id: "done", description: "effect reconciled", verifier: "verify.done", required: true }],
    deliverables: ["result"],
    riskClass: "external_write"
  });
}

function makeStep(): WorkStep {
  return {
    id: "step-recover",
    operation: "recover.test",
    input: {},
    idempotencyKey: "idem-recover",
    riskClass: "external_write"
  };
}

function setup(registry: CapabilityRegistry, verification: VerificationEngine, executed: { count: number }) {
  const capability: Capability = {
    name: "recover.test.capability",
    version: "1.0.0",
    operations: ["recover.test"],
    riskClass: "external_write",
    execute: async () => {
      executed.count += 1;
      return { status: "accepted", data: { executed: true } };
    }
  };
  const verifier: Verifier = {
    name: "verify.done",
    verify: async (): Promise<VerificationCheck> => ({
      id: "done",
      criterion: "effect reconciled",
      passed: true,
      evidence: []
    })
  };
  registry.register(capability);
  verification.register(verifier);
}

test("recovery reloads persisted work, waits for expired lease, reconciles ambiguous effect, and avoids duplicate execution", async () => {
  const dir = tempDir("workproof-recovery-");
  const workDir = path.join(dir, "work");
  const dbPath = path.join(dir, "leases.db");
  const repo = new JsonWorkRepository(workDir);
  const clock = new FakeClock();
  const leaseStore = new PersistentLeaseStore(dbPath, { clock });

  const writerStore = new WorkStore();
  const work = makeWork(writerStore);
  const step = makeStep();
  const effect = writerStore.addEffect(work, "dead-worker-capability", "external_write", step.idempotencyKey, step.operation);
  effect.status = "unknown";
  effect.attempts = 1;
  effect.lastObservedState = { external: "already-created" };
  writerStore.transition(work, "running", "Simulated worker terminated while effect outcome was ambiguous");
  repo.save(work);

  const resourceId = `work:${work.id}:step:${step.id}`;
  const oldLease = leaseStore.acquire(resourceId, "dead-worker", 1000);
  assert.equal(oldLease.status, "acquired");
  clock.advance(1001);

  const executionStore = new WorkStore();
  const registry = new CapabilityRegistry();
  const verification = new VerificationEngine();
  const executed = { count: 0 };
  setup(registry, verification, executed);

  const engine = new WorkEngine(
    executionStore,
    registry,
    verification,
    async () => true,
    undefined,
    repo,
    {
      authority: leaseStore,
      ownerId: "replacement-worker",
      ttlMs: 1000
    }
  );

  const coordinator = new WorkRecoveryCoordinator(repo, executionStore, leaseStore);
  const candidates = coordinator.discover();
  assert.deepEqual(candidates.map((candidate) => candidate.workId), [work.id]);

  const recovered = await coordinator.recover({
    workId: work.id,
    ownerId: "replacement-worker",
    steps: [step],
    engine
  });

  assert.equal(recovered.status, "verified");
  assert.equal(executed.count, 0);
  assert.equal(recovered.effects[0].status, "verified");
  assert.ok(recovered.events.some((event) => event.type === "recovery.started"));
  assert.ok(recovered.events.some((event) => event.type === "recovery.finished"));

  leaseStore.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test("recovery remains waiting when another live owner still holds the lease", async () => {
  const dir = tempDir("workproof-recovery-busy-");
  const workDir = path.join(dir, "work");
  const dbPath = path.join(dir, "leases.db");
  const repo = new JsonWorkRepository(workDir);
  const clock = new FakeClock();
  const leaseStore = new PersistentLeaseStore(dbPath, { clock });

  const writerStore = new WorkStore();
  const work = makeWork(writerStore);
  const step = makeStep();
  writerStore.transition(work, "waiting_lease", "Worker is waiting for ownership");
  repo.save(work);

  const resourceId = `work:${work.id}:step:${step.id}`;
  const held = leaseStore.acquire(resourceId, "live-owner", 10_000);
  assert.equal(held.status, "acquired");

  const executionStore = new WorkStore();
  const registry = new CapabilityRegistry();
  const verification = new VerificationEngine();
  const executed = { count: 0 };
  setup(registry, verification, executed);

  const engine = new WorkEngine(
    executionStore,
    registry,
    verification,
    async () => false,
    undefined,
    repo,
    {
      authority: leaseStore,
      ownerId: "replacement-worker",
      ttlMs: 1000
    }
  );

  const coordinator = new WorkRecoveryCoordinator(repo, executionStore, leaseStore);
  const result = await coordinator.recover({
    workId: work.id,
    ownerId: "replacement-worker",
    steps: [step],
    engine
  });

  assert.equal(result.status, "waiting_lease");
  assert.equal(executed.count, 0);
  assert.ok(result.events.some((event) => event.type === "lease.busy"));

  leaseStore.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test("a stale worker cannot renew a lease after ownership moves to a replacement worker", () => {
  const dir = tempDir("workproof-recovery-ownership-");
  const dbPath = path.join(dir, "leases.db");
  const clock = new FakeClock();
  const store = new PersistentLeaseStore(dbPath, { clock });

  const resourceId = "shared-recovery-resource";
  const first = store.acquire(resourceId, "worker-old", 1000);
  assert.equal(first.status, "acquired");
  clock.advance(1001);

  const replacement = store.acquire(resourceId, "worker-new", 1000);
  assert.equal(replacement.status, "acquired");

  assert.throws(
    () => store.renew(resourceId, first.lease.leaseId, "worker-old", 1000),
    /Lease ownership mismatch/
  );
  assert.throws(
    () => store.release(resourceId, first.lease.leaseId, "worker-old"),
    /Lease ownership mismatch/
  );

  assert.equal(store.get(resourceId)?.ownerId, "worker-new");
  store.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

export {};
