const assert = require("assert");
const test = require("node:test");
const { WorkStore } = require("../packages/core/src/work.js");
const { CapabilityRegistry } = require("../packages/capabilities/src/registry.js");
const { VerificationEngine } = require("../packages/verification/src/engine.js");
const { WorkEngine } = require("../packages/runtime/src/engine.js");
const { registerResearchPack } = require("../packages/packs/src/research-pack.js");
const { registerLocalPack } = require("../packages/packs/src/local-pack.js");
const { JsonWorkRepository } = require("../packages/storage/src/json.js");
const { canExecute } = require("../packages/policy/src/guard.js");

const fs = require("fs");

test("research work executes, deduplicates, and verifies artifact", async () => {
  const output = require("path").join(require("os").tmpdir(), "research-output.json"); try { fs.unlinkSync(output); } catch {}
  const store = new WorkStore(); const registry = new CapabilityRegistry(); const verification = new VerificationEngine();
  registerResearchPack(registry, verification);
  const work = store.create({ objective: "Find verified suppliers", inputs: { dataPath: "./lab/data/suppliers.json", minRecords: 4, outputPath: output }, success: [{ id: "artifact", description: "At least four unique supplier records with required fields", verifier: "pack.research.artifact", required: true }], deliverables: [output], riskClass: "read" });
  const engine = new WorkEngine(store, registry, verification, async () => fs.existsSync(output));
  await engine.run(work, [{ id: "research", operation: "research_suppliers", capability: "pack.research.local", input: { dataPath: "./lab/data/suppliers.json", minRecords: 4, outputPath: output }, idempotencyKey: `research:${output}`, riskClass: "read" }]);
  assert.equal(work.status, "verified");
  const records = JSON.parse(fs.readFileSync(output, "utf8"));
  assert.equal(records.length, 4);
});

test("local pack creates and repository persists work state", () => {
  const store = new WorkStore(); const registry = new CapabilityRegistry(); registerLocalPack(registry);
  const work = store.create({ objective: "persist", success: [], deliverables: [], riskClass: "local_write" });
  const repo = new JsonWorkRepository(require("path").join(require("os").tmpdir(), "work-repo-test")); const path = repo.save(work); const loaded = repo.load(work.id);
  assert.ok(fs.existsSync(path)); assert.equal(loaded.id, work.id);
});

test("risk policy blocks high-risk operation without approval", () => {
  const store = new WorkStore(); const work = store.create({ objective: "send", success: [], deliverables: [], riskClass: "external_write", approvalRequired: true });
  const result = canExecute({ maxRisk: "external_write", approvalRequiredAbove: "external_write", approved: false }, work, "external_write");
  assert.equal(result.allowed, false);
  assert.match(result.reason, /approval/i);
});


test("resume does not re-execute an already acknowledged external effect", async () => {
  const path = require("path").join(require("os").tmpdir(), "work-resume-no-duplicate");
  fs.rmSync(path, { recursive: true, force: true });

  let calls = 0;
  const store = new WorkStore();
  const registry = new CapabilityRegistry();
  const verification = new VerificationEngine();
  const capability = {
    name: "resume-safe-writer",
    version: "1",
    operations: ["write_once"],
    riskClass: "external_write",
    execute: async () => {
      calls++;
      return { status: "accepted", externalEffectId: "external:1" };
    }
  };
  registry.register(capability);
  verification.register({
    name: "resume-proof",
    verify: async (ctx: any) => ({
      id: ctx.criterion.id,
      criterion: ctx.criterion.description,
      passed: calls === 1,
      evidence: []
    })
  });

  const contract = {
    objective: "write once and safely resume",
    success: [{ id: "proof", description: "Exactly one external write occurred", verifier: "resume-proof", required: true }],
    deliverables: [],
    riskClass: "external_write"
  };
  const input = { value: "one" };
  const step = {
    id: "write",
    operation: "write_once",
    capability: "resume-safe-writer",
    input,
    idempotencyKey: "resume:write:1",
    riskClass: "external_write"
  };
  const repo = new JsonWorkRepository(path);
  const work = store.create(contract);
  const firstEngine = new WorkEngine(store, registry, verification, async () => false, undefined, repo);
  await firstEngine.run(work, [step]);
  assert.equal(work.status, "verified");
  assert.equal(calls, 1);

  const loaded = repo.load(work.id);
  const resumedStore = new WorkStore();
  const resumedRegistry = new CapabilityRegistry();
  const resumedVerification = new VerificationEngine();
  resumedStore.register(loaded);
  resumedRegistry.register(capability);
  resumedVerification.register({
    name: "resume-proof",
    verify: async (ctx: any) => ({
      id: ctx.criterion.id,
      criterion: ctx.criterion.description,
      passed: calls === 1,
      evidence: []
    })
  });

  const resumedEngine = new WorkEngine(resumedStore, resumedRegistry, resumedVerification, async () => false, undefined, repo);
  await resumedEngine.run(loaded, [step]);

  assert.equal(loaded.status, "verified");
  assert.equal(calls, 1);
  assert.ok(loaded.events.some((e: any) => e.type === "step.resumed"));
});


test("persisted idempotency keys reject changed operation or input before execution", async () => {
  const path = require("path").join(require("os").tmpdir(), "work-idempotency-drift");
  fs.rmSync(path, { recursive: true, force: true });

  let calls = 0;
  const store = new WorkStore();
  const registry = new CapabilityRegistry();
  const verification = new VerificationEngine();
  registry.register({
    name: "drift-safe",
    version: "1",
    operations: ["publish"],
    riskClass: "external_write",
    execute: async () => {
      calls++;
      return { status: "accepted", externalEffectId: "external:drift" };
    }
  });
  verification.register({
    name: "drift-proof",
    verify: async (ctx: any) => ({
      id: ctx.criterion.id,
      criterion: ctx.criterion.description,
      passed: calls === 1,
      evidence: []
    })
  });

  const contract = {
    objective: "reject idempotency drift",
    success: [{ id: "proof", description: "Exactly one publish occurred", verifier: "drift-proof", required: true }],
    deliverables: [],
    riskClass: "external_write"
  };
  const firstStep = {
    id: "publish",
    operation: "publish",
    capability: "drift-safe",
    input: { record: "A" },
    idempotencyKey: "drift:1",
    riskClass: "external_write"
  };
  const repo = new JsonWorkRepository(path);
  const work = store.create(contract);
  const firstEngine = new WorkEngine(store, registry, verification, async () => false, undefined, repo);
  await firstEngine.run(work, [firstStep]);
  assert.equal(work.status, "verified");
  assert.equal(calls, 1);
  assert.deepEqual(work.effects[0].input, { record: "A" });

  const loaded = repo.load(work.id);
  const resumedStore = new WorkStore();
  const resumedRegistry = new CapabilityRegistry();
  const resumedVerification = new VerificationEngine();
  resumedStore.register(loaded);
  resumedRegistry.register({
    name: "drift-safe",
    version: "1",
    operations: ["publish"],
    riskClass: "external_write",
    execute: async () => {
      calls++;
      return { status: "accepted", externalEffectId: "external:drift-duplicate" };
    }
  });
  resumedVerification.register({
    name: "drift-proof",
    verify: async () => ({ id: "proof", criterion: "Exactly one publish occurred", passed: calls === 1, evidence: [] })
  });
  const beforeStatus = loaded.status;
  await assert.rejects(
    new WorkEngine(resumedStore, resumedRegistry, resumedVerification, async () => false, undefined, repo)
      .run(loaded, [{
        ...firstStep,
        input: { record: "B" }
      }]),
    /Persisted effect input does not match/
  );
  assert.equal(loaded.status, beforeStatus);
  assert.equal(calls, 1);

  fs.rmSync(path, { recursive: true, force: true });
});

test("same idempotency key with reordered JSON object keys remains compatible", async () => {
  const store = new WorkStore();
  const registry = new CapabilityRegistry();
  const verification = new VerificationEngine();
  const work = store.create({ objective: "canonical input", success: [], deliverables: [], riskClass: "read" });
  const first = store.addEffect(work, "cap", "read", "canonical:1", "read", { a: 1, b: { x: 2, y: 3 } });
  const second = store.addEffect(work, "cap", "read", "canonical:1", "read", { b: { y: 3, x: 2 }, a: 1 });
  assert.equal(first.effectId, second.effectId);
});

export {};

test("router honors preferred capability and risk ceiling", () => {
  const { selectCapability } = require("../packages/runtime/src/router.js");
  const reg = new CapabilityRegistry();
  const one = { name: "a", version: "1", operations: ["read"], riskClass: "read", execute: async () => ({ status: "accepted" }) };
  const two = { name: "b", version: "1", operations: ["read"], riskClass: "local_write", execute: async () => ({ status: "accepted" }) };
  reg.register(one); reg.register(two);
  assert.equal(selectCapability(reg, { operation: "read", riskClass: "local_write", preferred: ["b"] }).name, "b");
});


test("work with no success criteria is not falsely marked verified", async () => {
  const store = new WorkStore();
  const verification = new VerificationEngine();
  const work = store.create({ objective: "no proof", success: [], deliverables: [], riskClass: "read" });
  const result = await verification.verify(work);
  assert.equal(result.status, "unverifiable");
  assert.equal(work.status, "unverifiable");
});

test("runtime rejects a capability whose declared risk exceeds the step ceiling", async () => {
  const store = new WorkStore(); const registry = new CapabilityRegistry(); const verification = new VerificationEngine();
  registry.register({ name: "unsafe", version: "1", operations: ["write"], riskClass: "financial", execute: async () => ({ status: "accepted" }) });
  const work = store.create({ objective: "risk", success: [{ id: "x", description: "never checked", verifier: "missing", required: true }], deliverables: [], riskClass: "external_write" });
  const { WorkEngine } = require("../packages/runtime/src/engine.js");
  const engine = new WorkEngine(store, registry, verification, async () => false);
  await engine.run(work, [{ id: "step", operation: "write", capability: "unsafe", input: {}, idempotencyKey: "k", riskClass: "external_write" }]);
  assert.equal(work.status, "failed");
  assert.match(work.events.at(-1).message, /risk ceiling/i);
});


test("runtime substitutes a rejected primary capability with a compatible fallback", async () => {
  const calls: string[] = [];
  const store = new WorkStore(); const registry = new CapabilityRegistry(); const verification = new VerificationEngine();
  registry.register({ name: "primary", version: "1", operations: ["collect"], riskClass: "read", execute: async () => { calls.push("primary"); return { status: "rejected" }; } });
  registry.register({ name: "fallback", version: "1", operations: ["collect"], riskClass: "read", execute: async () => { calls.push("fallback"); return { status: "accepted" }; } });
  verification.register({ name: "done", verify: async (ctx: any) => ({ id: ctx.criterion.id, criterion: ctx.criterion.description, passed: calls.includes("fallback"), evidence: [] }) });
  const work = store.create({ objective: "substitute", success: [{ id: "done", description: "fallback completed", verifier: "done", required: true }], deliverables: [], riskClass: "read" });
  const engine = new WorkEngine(store, registry, verification, async () => false);
  await engine.run(work, [{ id: "step", operation: "collect", capability: "primary", input: {}, idempotencyKey: "collect:1", riskClass: "read", maxAttempts: 2 }]);
  assert.deepEqual(calls, ["primary", "fallback"]);
  assert.equal(work.status, "verified");
});

test("multi-step work chains local research into a verified artifact", async () => {
  const output = require("path").join(require("os").tmpdir(), "multistep-research.json");
  try { fs.unlinkSync(output); } catch {}
  const store = new WorkStore(); const registry = new CapabilityRegistry(); const verification = new VerificationEngine();
  registerResearchPack(registry, verification);
  const work = store.create({
    objective: "Discover suppliers and materialize a verified artifact",
    inputs: { dataPath: "./lab/data/suppliers.json", minRecords: 4, outputPath: output },
    success: [{ id: "artifact", description: "Verified research artifact exists", verifier: "pack.research.artifact", required: true }],
    deliverables: [output], riskClass: "local_write"
  });
  const engine = new WorkEngine(store, registry, verification, async (_w: any, effectId: string) => Boolean(work.effects.find((e: any) => e.effectId === effectId)?.receipt));
  await engine.run(work, [
    { id: "discover", operation: "research_suppliers", capability: "pack.research.local", input: { dataPath: "./lab/data/suppliers.json", minRecords: 4, outputPath: output }, idempotencyKey: "research:" + output, riskClass: "local_write" },
    { id: "materialize", operation: "research_suppliers", capability: "pack.research.local", input: { dataPath: "./lab/data/suppliers.json", minRecords: 4, outputPath: output }, idempotencyKey: "research:materialize:" + output, riskClass: "local_write" }
  ]);
  assert.equal(work.status, "verified");
  assert.equal(work.events.filter((e: any) => e.type === "step.finished").length, 2);
  assert.equal(JSON.parse(fs.readFileSync(output, "utf8")).length, 4);
});

test("runtime substitutes after repeated ambiguous outcome instead of retrying the same capability forever", async () => {
  const calls: string[] = [];
  const store = new WorkStore(); const registry = new CapabilityRegistry(); const verification = new VerificationEngine();
  registry.register({ name: "flaky-primary", version: "1", operations: ["publish"], riskClass: "external_write", execute: async () => { calls.push("primary"); return { status: "ambiguous", data: { reason: "lost-ack" } }; } });
  registry.register({ name: "safe-fallback", version: "1", operations: ["publish"], riskClass: "external_write", execute: async () => { calls.push("fallback"); return { status: "accepted", externalEffectId: "fallback:1" }; } });
  verification.register({ name: "done2", verify: async (ctx: any) => ({ id: ctx.criterion.id, criterion: ctx.criterion.description, passed: calls.includes("fallback"), evidence: [] }) });
  const work = store.create({ objective: "Publish with recovery", success: [{ id: "done2", description: "fallback publishes", verifier: "done2", required: true }], deliverables: [], riskClass: "external_write" });
  const engine = new WorkEngine(store, registry, verification, async () => false);
  await engine.run(work, [{ id: "publish", operation: "publish", capability: "flaky-primary", input: {}, idempotencyKey: "publish:1", riskClass: "external_write", maxAttempts: 4 }]);
  assert.equal(work.status, "verified");
  assert.deepEqual(calls, ["primary", "primary", "fallback"]);
  assert.ok(work.events.some((e: any) => e.type === "recovery.substitute"));
});

test("runtime enforces approval policy before an external write capability executes", async () => {
  let calls = 0;
  const store = new WorkStore(); const registry = new CapabilityRegistry(); const verification = new VerificationEngine();
  registry.register({ name: "publisher", version: "1", operations: ["publish"], riskClass: "external_write", execute: async () => { calls++; return { status: "accepted" }; } });
  const work = store.create({ objective: "approval required", success: [], deliverables: [], riskClass: "external_write", approvalRequired: true });
  const engine = new WorkEngine(store, registry, verification, async () => false, { maxRisk: "external_write", approvalRequiredAbove: "external_write", approved: false });
  await engine.run(work, [{ id: "publish", operation: "publish", capability: "publisher", input: {}, idempotencyKey: "publish:approval", riskClass: "external_write" }]);
  assert.equal(work.status, "failed");
  assert.equal(calls, 0);
  assert.match(work.events.at(-1).message, /approval/i);
});

test("persisted work can be reloaded as the same durable work object", () => {
  const fs = require("fs");
  const path = require("path").join(require("os").tmpdir(), "work-resume-test");
  fs.rmSync(path, { recursive: true, force: true });
  const store = new WorkStore(); const work = store.create({ objective: "resume me", success: [], deliverables: [], riskClass: "read" });
  const repo = new JsonWorkRepository(path); repo.save(work);
  const loaded = repo.load(work.id);
  assert.equal(loaded.id, work.id);
  assert.equal(loaded.contract.objective, "resume me");
  assert.ok(Array.isArray(loaded.events));
});

test("reconciliation verifier exceptions remain recoverable and are audited", async () => {
  const calls: string[] = [];
  const store = new WorkStore(); const registry = new CapabilityRegistry(); const verification = new VerificationEngine();
  registry.register({ name: "ambiguous", version: "1", operations: ["write"], riskClass: "external_write", execute: async () => { calls.push("ambiguous"); return { status: "ambiguous" }; } });
  registry.register({ name: "fallback", version: "1", operations: ["write"], riskClass: "external_write", execute: async () => { calls.push("fallback"); return { status: "accepted", externalEffectId: "fallback:write" }; } });
  verification.register({ name: "done3", verify: async (ctx: any) => ({ id: ctx.criterion.id, criterion: ctx.criterion.description, passed: calls.includes("fallback"), evidence: [] }) });
  const work = store.create({ objective: "Recover after verifier failure", success: [{ id: "done3", description: "fallback succeeds", verifier: "done3", required: true }], deliverables: [], riskClass: "external_write" });
  let verifyChecks = 0;
  const engine = new WorkEngine(store, registry, verification, async () => { verifyChecks++; if (verifyChecks === 1) throw new Error("temporary verifier outage"); return false; });
  await engine.run(work, [{ id: "write", operation: "write", capability: "ambiguous", input: {}, idempotencyKey: "write:1", riskClass: "external_write", maxAttempts: 4 }]);
  assert.equal(work.status, "verified");
  assert.deepEqual(calls, ["ambiguous", "ambiguous", "fallback"]);
  assert.equal(work.effects[0].attemptLog.length, 3);
  assert.equal(work.effects[0].attemptLog[0].capability, "ambiguous");
  assert.equal(work.effects[0].attemptLog[2].capability, "fallback");
  assert.ok(work.events.some((e: any) => e.type === "recovery.reconcile_failed"));
});


test("runtime enforces the work contract risk ceiling before routing a step", async () => {
  let calls = 0;
  const store = new WorkStore(); const registry = new CapabilityRegistry(); const verification = new VerificationEngine();
  registry.register({ name: "writer", version: "1", operations: ["publish"], riskClass: "external_write", execute: async () => { calls++; return { status: "accepted" }; } });
  const work = store.create({ objective: "contract ceiling", success: [], deliverables: [], riskClass: "read" });
  const engine = new WorkEngine(store, registry, verification, async () => false);
  await engine.run(work, [{ id: "publish", operation: "publish", capability: "writer", input: {}, idempotencyKey: "publish:ceiling", riskClass: "external_write" }]);
  assert.equal(work.status, "failed");
  assert.equal(calls, 0);
  assert.match(work.events.at(-1).message, /work contract risk ceiling/i);
});
