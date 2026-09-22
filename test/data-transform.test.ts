const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const path = require("path");

const { WorkStore } = require("../packages/core/src/work.js");
const { CapabilityRegistry } = require("../packages/capabilities/src/registry.js");
const { VerificationEngine } = require("../packages/verification/src/engine.js");
const { WorkEngine } = require("../packages/runtime/src/engine.js");
const { registerDataTransformPack } = require("../packages/packs/src/data-transform-pack.js");

function fixture() {
  const dir = fs.mkdtempSync(path.join(require("os").tmpdir(), "workproof-transform-"));
  const inputPath = path.join(dir, "input.json");
  const outputPath = path.join(dir, "output.json");
  fs.writeFileSync(inputPath, JSON.stringify([
    { id: 3, name: "Gamma", state: "hold", score: 5 },
    { id: 1, name: "Alpha", state: "ready", score: 9 },
    { id: 2, name: "Beta", state: "ready", score: 7 }
  ], null, 2));
  return { dir, inputPath, outputPath };
}

function setup() {
  const store = new WorkStore();
  const registry = new CapabilityRegistry();
  const verification = new VerificationEngine();
  registerDataTransformPack(registry, verification);
  return { store, registry, verification };
}

test("JSON transform performs filter, sort, projection, bounded output, and independent verification", async () => {
  const f = fixture();
  try {
    const { store, registry, verification } = setup();
    const input = {
      inputPath: f.inputPath,
      outputPath: f.outputPath,
      filter: { field: "state", equals: "ready" },
      select: ["id", "name", "score"],
      sortBy: { field: "score", direction: "desc" },
      limit: 1
    };
    const work = store.create({
      objective: "Transform ready items",
      inputs: input,
      constraints: {},
      success: [{ id: "output", description: "Transformed output matches declared result", verifier: "pack.transform.json", required: true }],
      deliverables: ["transformed JSON"],
      riskClass: "local_write"
    });
    const engine = new WorkEngine(store, registry, verification, async () => false);
    await engine.run(work, [{
      id: "transform",
      operation: "transform",
      capability: "pack.transform.json",
      input,
      idempotencyKey: "transform:fixture:ready",
      riskClass: "local_write"
    }]);

    assert.equal(work.status, "verified");
    assert.deepEqual(JSON.parse(fs.readFileSync(f.outputPath, "utf8")), [{ id: 1, name: "Alpha", score: 9 }]);
    assert.ok(work.artifacts.some((a: any) => a.kind === "transform-verification"));
  } finally {
    fs.rmSync(f.dir, { recursive: true, force: true });
  }
});

test("JSON transform is deterministic for repeated execution", async () => {
  const f = fixture();
  try {
    const { registry } = setup();
    const capability = registry.get("pack.transform.json");
    const input = { inputPath: f.inputPath, outputPath: f.outputPath, select: ["id", "name"], sortBy: { field: "id", direction: "asc" }, limit: 10 };
    const first = await capability.execute({ operation: "transform", input }, { work: {}, effect: undefined, log: () => {} });
    const firstBytes = fs.readFileSync(f.outputPath, "utf8");
    const second = await capability.execute({ operation: "transform", input }, { work: {}, effect: undefined, log: () => {} });
    const secondBytes = fs.readFileSync(f.outputPath, "utf8");
    assert.equal(first.status, "accepted");
    assert.equal(second.status, "accepted");
    assert.equal(firstBytes, secondBytes);
  } finally {
    fs.rmSync(f.dir, { recursive: true, force: true });
  }
});

test("JSON transform fails closed on oversized rows, unsafe fields, unsupported roots, and arbitrary expressions", async () => {
  const f = fixture();
  try {
    const { registry } = setup();
    const capability = registry.get("pack.transform.json");
    const context = { work: {}, effect: undefined, log: () => {} };

    fs.writeFileSync(f.inputPath, JSON.stringify({ id: 1 }), "utf8");
    const root = await capability.execute({ operation: "transform", input: { inputPath: f.inputPath, outputPath: f.outputPath } }, context);
    assert.equal(root.status, "rejected");

    fs.writeFileSync(f.inputPath, JSON.stringify([{ id: 1 }]), "utf8");
    const unsafe = await capability.execute({
      operation: "transform",
      input: { inputPath: f.inputPath, outputPath: f.outputPath, select: ["id;process"] }
    }, context);
    assert.equal(unsafe.status, "rejected");

    const expression = await capability.execute({
      operation: "transform",
      input: { inputPath: f.inputPath, outputPath: f.outputPath, filter: { field: "id", equals: { "$where": "process.exit()" } } }
    }, context);
    assert.equal(expression.status, "rejected");

    const many = Array.from({ length: 10001 }, (_, i) => ({ id: i }));
    fs.writeFileSync(f.inputPath, JSON.stringify(many), "utf8");
    const oversized = await capability.execute({ operation: "transform", input: { inputPath: f.inputPath, outputPath: f.outputPath } }, context);
    assert.equal(oversized.status, "rejected");
  } finally {
    fs.rmSync(f.dir, { recursive: true, force: true });
  }
});

test("JSON transform enforces the 500-row output limit and produces evidence", async () => {
  const f = fixture();
  try {
    const { registry } = setup();
    const capability = registry.get("pack.transform.json");
    const rows = Array.from({ length: 600 }, (_, i) => ({ id: i }));
    fs.writeFileSync(f.inputPath, JSON.stringify(rows), "utf8");
    const result = await capability.execute({
      operation: "transform",
      input: { inputPath: f.inputPath, outputPath: f.outputPath }
    }, { work: {}, effect: undefined, log: () => {} });
    assert.equal(result.status, "accepted");
    assert.equal(result.data.outputRows, 500);
    assert.equal(result.data.truncated, true);
    assert.ok(result.evidence.some((e: any) => e.kind === "transform-output"));
  } finally {
    fs.rmSync(f.dir, { recursive: true, force: true });
  }
});

export {};
