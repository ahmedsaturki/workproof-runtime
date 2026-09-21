const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { fork } = require("child_process");

import { Capability, CapabilityContext, VerificationCheck, Verifier, WorkObject } from "../packages/core/src/types";
import { CapabilityRegistry } from "../packages/capabilities/src/registry";
import { WorkStore } from "../packages/core/src/work";
import { LeaseAcquireResult, LeaseRecord, LeaseStore, PersistentLeaseStore } from "../packages/coordination/src/persistent";
import { ExecutionLeaseAuthority, WorkEngine, WorkStep } from "../packages/runtime/src/engine";
import { VerificationEngine } from "../packages/verification/src/engine";

function tempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function makeWork(store: WorkStore, suffix: string): WorkObject {
  return store.create({
    objective: "fencing " + suffix,
    success: [{ id: "done", description: "guarded execution completed", verifier: "verify.done", required: true }],
    deliverables: ["result"],
    riskClass: "external_write"
  });
}

function makeStep(suffix: string): WorkStep {
  return {
    id: "step-" + suffix,
    operation: "fence.test",
    input: {},
    idempotencyKey: "fence-" + suffix,
    riskClass: "external_write"
  };
}

function registerFenceCapability(
  registry: CapabilityRegistry,
  verification: VerificationEngine,
  calls: { count: number; fenceToken?: string }
): void {
  const capability: Capability = {
    name: "fence.test.capability",
    version: "1.0.0",
    operations: ["fence.test"],
    riskClass: "external_write",
    execute: async (_request, ctx: CapabilityContext) => {
      calls.count += 1;
      calls.fenceToken = ctx.executionFence?.token;
      ctx.executionFence?.assertOwned();
      return {
        status: "accepted",
        data: { fenceToken: ctx.executionFence?.token ?? null }
      };
    }
  };

  const verifier: Verifier = {
    name: "verify.done",
    verify: async (): Promise<VerificationCheck> => ({
      id: "done",
      criterion: "guarded execution completed",
      passed: true,
      evidence: []
    })
  };

  registry.register(capability);
  verification.register(verifier);
}

class FakeAuthority implements ExecutionLeaseAuthority {
  private current: LeaseRecord;
  private stale = false;

  constructor(resourceId: string, ownerId: string) {
    const timestamp = new Date().toISOString();
    this.current = {
      version: "0.1",
      leaseId: "lease-fake",
      resourceId,
      ownerId,
      acquiredAt: timestamp,
      renewedAt: timestamp,
      expiresAt: new Date(Date.now() + 10_000).toISOString(),
      revision: 1
    };
  }

  acquire(): LeaseAcquireResult {
    return { status: "acquired", lease: { ...this.current } };
  }

  renew(): LeaseRecord {
    return { ...this.current, revision: this.current.revision + 1, renewedAt: new Date().toISOString() };
  }

  release(): boolean {
    return true;
  }

  assertOwned(_resourceId: string, _leaseId: string, _ownerId: string): LeaseRecord {
    if (this.stale) throw new Error("fence token is stale");
    return { ...this.current };
  }

  makeStale(): void {
    this.stale = true;
  }
}

test("WorkEngine exposes an execution fence to capability code and validates it before execution", async () => {
  const store = new WorkStore();
  const registry = new CapabilityRegistry();
  const verification = new VerificationEngine();
  const authority = new FakeAuthority("unused", "worker-fence");
  const calls = { count: 0 };

  registerFenceCapability(registry, verification, calls);
  const engine = new WorkEngine(
    store,
    registry,
    verification,
    async () => false,
    undefined,
    undefined,
    { authority, ownerId: "worker-fence", ttlMs: 1000 }
  );

  const work = makeWork(store, "available");
  const result = await engine.run(work, [makeStep("available")]);

  assert.equal(result.status, "verified");
  assert.equal(calls.count, 1);
  assert.ok(calls.fenceToken?.startsWith("lease-fake:"));
  assert.ok(result.events.some((event) => event.type === "lease.acquired"));
});

test("WorkEngine refuses to cross the execution boundary after the lease becomes stale", async () => {
  const store = new WorkStore();
  const registry = new CapabilityRegistry();
  const verification = new VerificationEngine();
  const authority = new FakeAuthority("unused", "worker-stale");
  const calls = { count: 0 };

  registerFenceCapability(registry, verification, calls);
  authority.makeStale();

  const engine = new WorkEngine(
    store,
    registry,
    verification,
    async () => false,
    undefined,
    undefined,
    { authority, ownerId: "worker-stale", ttlMs: 1000 }
  );

  const work = makeWork(store, "stale");
  const result = await engine.run(work, [makeStep("stale")]);

  assert.equal(result.status, "unresolved");
  assert.equal(calls.count, 0);
  assert.ok(result.events.some((event) => event.type === "lease.fence_rejected"));
  assert.equal(result.effects.length, 0);
});

interface WorkerMessage {
  type: "ready" | "acquire" | "fence" | "error";
  workerId: string;
  accepted?: boolean;
  token?: string;
  leaseId?: string;
  revision?: number;
  error?: string;
  result?: {
    status: string;
    lease: LeaseRecord;
  };
}

function startFencedWorker(dbPath: string, workerId: string, resourceId: string, ttlMs: number) {
  const script = path.resolve("dist/apps/fenced-worker.js");
  const child = fork(script, [dbPath, workerId, resourceId, String(ttlMs)], { stdio: ["ignore", "ignore", "ignore", "ipc"] });

  const waitFor = (expected: WorkerMessage["type"]): Promise<WorkerMessage> =>
    new Promise((resolve, reject) => {
      const onMessage = (message: WorkerMessage) => {
        if (message.type === expected || message.type === "error") {
          child.off("message", onMessage);
          child.off("error", onError);
          if (message.type === "error") reject(new Error(message.error));
          else resolve(message);
        }
      };
      const onError = (error: Error) => {
        child.off("message", onMessage);
        reject(error);
      };
      child.on("message", onMessage);
      child.once("error", onError);
    });

  return {
    child,
    ready: waitFor("ready"),
    waitFor
  };
}

test("two real processes enforce stale-worker fencing after lease takeover", async () => {
  const root = tempDir("workproof-fence-process-");
  const dbPath = path.join(root, "leases.db");
  const resourceId = "work:fence:step:1";
  const oldWorker = startFencedWorker(dbPath, "worker-old", resourceId, 120);

  try {
    await oldWorker.ready;
    oldWorker.child.send("acquire");
    const acquired = await oldWorker.waitFor("acquire");
    assert.equal(acquired.result?.status, "acquired");

    await new Promise<void>((resolve) => setTimeout(resolve, 200));

    const replacement = new PersistentLeaseStore(dbPath);
    try {
      const takeover = replacement.acquire(resourceId, "worker-new", 10_000);
      assert.equal(takeover.status, "acquired");

      oldWorker.child.send("fence");
      const stale = await oldWorker.waitFor("fence");
      assert.equal(stale.accepted, false);
      assert.match(String(stale.error), /Lease is not currently owned by caller/);

      assert.equal(replacement.assertOwned(resourceId, takeover.lease.leaseId, "worker-new").ownerId, "worker-new");
    } finally {
      replacement.close();
    }
  } finally {
    if (oldWorker.child.connected) {
      oldWorker.child.send("close");
      await new Promise<void>((resolve) => setTimeout(resolve, 20));
      if (oldWorker.child.connected) oldWorker.child.kill("SIGKILL");
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
});

export {};
