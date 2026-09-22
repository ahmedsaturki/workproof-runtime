import { Capability, VerificationCheck, Verifier, WorkObject } from "../packages/core/src/types";
import { CapabilityRegistry } from "../packages/capabilities/src/registry";
import { WorkStore } from "../packages/core/src/work";
import { LeaseAcquireResult, LeaseClock, LeaseRecord, LeaseStore } from "../packages/coordination/src/leases";
import { ExecutionLeaseAuthority, ExecutionLeaseTimers, WorkEngine, WorkStep } from "../packages/runtime/src/engine";
import { VerificationEngine } from "../packages/verification/src/engine";
const assert = require("assert");
const test = require("node:test");

class FakeClock implements LeaseClock {
  constructor(public value: number = 1_700_000_000_000) {}
  nowMs(): number { return this.value; }
  advance(ms: number): void { this.value += ms; }
}

class ManualTimerScheduler implements ExecutionLeaseTimers {
  private callbacks = new Set<() => void>();
  setInterval(handler: () => void): ReturnType<typeof setInterval> {
    this.callbacks.add(handler);
    return handler as unknown as ReturnType<typeof setInterval>;
  }
  clearInterval(handle: ReturnType<typeof setInterval>): void {
    this.callbacks.delete(handle as unknown as () => void);
  }
  tick(): void {
    for (const callback of [...this.callbacks]) callback();
  }
}

function makeWork(store: WorkStore, idSuffix: string): WorkObject {
  return store.create({
    objective: "execution lease " + idSuffix,
    success: [{ id: "done", description: "operation completed", verifier: "verify.done", required: true }],
    deliverables: ["result"],
    riskClass: "read"
  });
}

function makeStep(idSuffix: string): WorkStep {
  return {
    id: "step-" + idSuffix,
    operation: "lease.test",
    input: {},
    idempotencyKey: "idem-" + idSuffix,
    riskClass: "read"
  };
}

function registerTestOperation(
  registry: CapabilityRegistry,
  verification: VerificationEngine,
  onExecute: () => Promise<void>
): void {
  const capability: Capability = {
    name: "lease.test.capability",
    version: "1.0.0",
    operations: ["lease.test"],
    riskClass: "read",
    execute: async () => {
      await onExecute();
      return { status: "accepted", data: { ok: true } };
    }
  };

  const verifier: Verifier = {
    name: "verify.done",
    verify: async (): Promise<VerificationCheck> => ({
      id: "done",
      criterion: "operation completed",
      passed: true,
      evidence: []
    })
  };

  registry.register(capability);
  verification.register(verifier);
}

function makeEngine(
  store: WorkStore,
  registry: CapabilityRegistry,
  verification: VerificationEngine,
  leaseConfig?: {
    authority: ExecutionLeaseAuthority;
    ownerId: string;
    ttlMs: number;
    heartbeatIntervalMs?: number;
  }
): WorkEngine {
  return new WorkEngine(
    store,
    registry,
    verification,
    async () => false,
    undefined,
    undefined,
    leaseConfig
  );
}

test("WorkEngine refuses execution while another owner holds the execution lease", async () => {
  const store = new WorkStore();
  const registry = new CapabilityRegistry();
  const verification = new VerificationEngine();
  const authority = new LeaseStore();
  const work = makeWork(store, "busy");
  const step = makeStep("busy");
  const resourceId = "work:" + work.id + ":step:" + step.id;
  const held = authority.acquire(resourceId, "worker-a", 10_000);
  assert.equal(held.status, "acquired");

  let executions = 0;
  registerTestOperation(registry, verification, async () => {
    executions += 1;
  });

  const engine = makeEngine(store, registry, verification, {
    authority,
    ownerId: "worker-b",
    ttlMs: 500
  });

  const blocked = await engine.run(work, [step]);
  assert.equal(blocked.status, "waiting_lease");
  assert.equal(executions, 0);
  assert.equal(blocked.effects.length, 0);
  assert.ok(blocked.events.some((event) => event.type === "lease.busy"));

  assert.equal(authority.release(resourceId, held.lease.leaseId, "worker-a"), true);

  const resumed = await engine.run(work, [step]);
  assert.equal(resumed.status, "verified");
  assert.equal(executions, 1);
  assert.equal(authority.get(resourceId), null);
});

test("WorkEngine heartbeat renews a lease without wall-clock timing", async () => {
  const store = new WorkStore();
  const registry = new CapabilityRegistry();
  const verification = new VerificationEngine();
  const authority = new LeaseStore();
  const timers = new ManualTimerScheduler();
  const work = makeWork(store, "heartbeat");
  const step = makeStep("heartbeat");

  let executions = 0;
  let markStarted!: () => void;
  const started = new Promise<void>((resolve) => { markStarted = resolve; });
  let releaseCapability!: () => void;
  const capabilityGate = new Promise<void>((resolve) => { releaseCapability = resolve; });
  registerTestOperation(registry, verification, async () => {
    executions += 1;
    markStarted();
    timers.tick();
    await capabilityGate;
  });

  const engine = makeEngine(store, registry, verification, {
    authority,
    ownerId: "worker-heartbeat",
    ttlMs: 60,
    heartbeatIntervalMs: 10,
    timers
  });

  const running = engine.run(work, [step]);
  await started;
  assert.equal(executions, 1);
  releaseCapability();

  const result = await running;
  assert.equal(result.status, "verified");
  assert.equal(executions, 1);
  assert.ok(result.events.some((event) => event.type === "lease.heartbeat"));
  const resourceId = "work:" + work.id + ":step:" + step.id;
  assert.equal(authority.get(resourceId), null);
});

test("WorkEngine does not declare success after a deterministic heartbeat lease loss", async () => {
  const store = new WorkStore();
  const registry = new CapabilityRegistry();
  const verification = new VerificationEngine();
  const timers = new ManualTimerScheduler();
  const work = makeWork(store, "lost");
  const step = makeStep("lost");

  const lease: LeaseRecord = {
    version: "0.1",
    leaseId: "lease-loss",
    resourceId: "work:" + work.id + ":step:" + step.id,
    ownerId: "worker-lost",
    acquiredAt: new Date().toISOString(),
    renewedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 1000).toISOString(),
    revision: 1
  };

  let renewCalls = 0;
  const authority: ExecutionLeaseAuthority = {
    acquire: (): LeaseAcquireResult => ({ status: "acquired", lease }),
    renew: (): LeaseRecord => {
      renewCalls += 1;
      if (renewCalls === 1) {
        return {
          ...lease,
          revision: 2,
          renewedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 1000).toISOString()
        };
      }
      throw new Error("simulated worker lease loss");
    },
    release: () => true,
    assertOwned: () => lease
  };

  let executions = 0;
  let markStarted!: () => void;
  const started = new Promise<void>((resolve) => { markStarted = resolve; });
  let releaseCapability!: () => void;
  const capabilityGate = new Promise<void>((resolve) => { releaseCapability = resolve; });
  registerTestOperation(registry, verification, async () => {
    executions += 1;
    markStarted();
    await capabilityGate;
  });

  const engine = makeEngine(store, registry, verification, {
    authority,
    ownerId: "worker-lost",
    ttlMs: 40,
    heartbeatIntervalMs: 10,
    timers
  });

  const running = engine.run(work, [step]);
  await started;
  assert.equal(executions, 1);
  timers.tick();
  releaseCapability();

  const result = await running;
  assert.equal(executions, 1);
  assert.equal(result.status, "unresolved");
  assert.ok(result.events.some((event) => event.type === "lease.lost"));
  assert.ok(result.events.some((event) => event.type === "step.finished"));
  assert.notEqual(result.verification?.status, "verified");
});

export {};
