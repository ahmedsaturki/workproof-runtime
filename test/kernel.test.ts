const assert = require("assert");
const test = require("node:test");
const { WorkStore } = require("../packages/core/src/work.js");
const { CapabilityRegistry } = require("../packages/capabilities/src/registry.js");
const { executeWithSafety } = require("../packages/recovery/src/engine.js");
const { VerificationEngine } = require("../packages/verification/src/engine.js");

class MemoryWrite {
  name = "memory.write"; version = "0.1.0"; operations = ["write"]; riskClass = "external_write";
  calls = 0; state = new Set<string>();
  async execute(request: any, ctx: any) { this.calls++; this.state.add(String(request.input)); return { status: "accepted", externalEffectId: String(request.input) }; }
}

class MemoryVerifier {
  name = "memory.exists";
  private readonly cap: MemoryWrite;
  constructor(cap: MemoryWrite) { this.cap = cap; }
  async verify(ctx: any) {
    const value = String(ctx.work.contract.inputs.value);
    const ok = this.cap.state.has(value);
    return {
      id: ctx.criterion.id,
      criterion: ctx.criterion.description,
      passed: ok,
      evidence: ok ? [{ id: `memory:${value}`, kind: "memory" }] : []
    };
  }
}

test("work object is durable in-memory and tracks effect", () => {
  const store = new WorkStore();
  const work = store.create({ objective: "x", success: [], deliverables: [], riskClass: "read" });
  const effect = store.addEffect(work, "memory.write", "external_write", "k1");
  assert.equal(effect.status, "planned");
  assert.equal(work.effects.length, 1);
});

test("reconciliation prevents duplicate side effect after ambiguous result", async () => {
  const store = new WorkStore();
  const work = store.create({ objective: "write", inputs: { value: "A" }, success: [], deliverables: [], riskClass: "external_write" });
  const reg = new CapabilityRegistry(); const cap = new MemoryWrite(); reg.register(cap);
  const effect = store.addEffect(work, cap.name, cap.riskClass, "write:A");
  effect.status = "unknown"; cap.state.add("A");
  await executeWithSafety({ work, capability: cap, request: { operation: "write", input: "A", idempotencyKey: effect.idempotencyKey }, effect, registry: reg, verifyExternalState: async () => cap.state.has("A"), contextLog: () => {} });
  assert.equal(cap.calls, 0);
  assert.equal(effect.status, "verified");
});

test("verification produces evidence-backed verified outcome", async () => {
  const store = new WorkStore();
  const work = store.create({ objective: "verify", inputs: { value: "B" }, success: [{ id: "s", description: "B exists", verifier: "memory.exists", required: true }], deliverables: [], riskClass: "external_write" });
  const cap = new MemoryWrite(); cap.state.add("B");
  const verification = new VerificationEngine(); verification.register(new MemoryVerifier(cap));
  const result = await verification.verify(work);
  assert.equal(result.status, "verified");
  assert.equal(result.checks[0].evidence.length, 1);
});

test("capability registry supports substitution candidates", () => {
  const reg = new CapabilityRegistry();
  reg.register(new MemoryWrite());
  const second = new MemoryWrite(); second.name = "memory.write.alt"; reg.register(second);
  assert.equal(reg.findFor("write").length, 2);
});

test("work status reflects failed required verification", async () => {
  const store = new WorkStore();
  const work = store.create({ objective: "fail", inputs: { value: "C" }, success: [{ id: "s", description: "C exists", verifier: "memory.exists", required: true }], deliverables: [], riskClass: "read" });
  const verification = new VerificationEngine(); verification.register({ name: "memory.exists", verify: async () => ({ id: "s", criterion: "C exists", passed: false, evidence: [] }) });
  const result = await verification.verify(work);
  assert.equal(result.status, "failed");
  assert.equal(work.status, "failed");
});

export {};
