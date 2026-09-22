const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const path = require("path");

const { WorkStore } = require("../packages/core/src/work.js");
const { CapabilityRegistry } = require("../packages/capabilities/src/registry.js");
const { VerificationEngine } = require("../packages/verification/src/engine.js");
const { WorkEngine } = require("../packages/runtime/src/engine.js");
const { registerMessageOutboxPack } = require("../packages/packs/src/message-outbox-pack.js");

function setup() {
  const store = new WorkStore();
  const registry = new CapabilityRegistry();
  const verification = new VerificationEngine();
  registerMessageOutboxPack(registry, verification);
  return { store, registry, verification };
}

function fixture() {
  const dir = fs.mkdtempSync(path.join(require("os").tmpdir(), "workproof-mail-"));
  return {
    dir,
    input: {
      outboxPath: dir,
      from: "ops@example.com",
      to: ["customer@example.com", "audit@example.com"],
      subject: "Work complete",
      body: "Line one\r\nLine two\n"
    }
  };
}

test("message outbox composes a deterministic RFC-style artifact and independently verifies it", async () => {
  const f = fixture();
  try {
    const { store, registry, verification } = setup();
    const work = store.create({
      objective: "Create local outbound message",
      inputs: f.input,
      constraints: {},
      success: [{ id: "message", description: "Outbox message matches declared content", verifier: "pack.messaging.outbox", required: true }],
      deliverables: ["RFC-style message"],
      riskClass: "local_write"
    });
    const engine = new WorkEngine(store, registry, verification, async () => false);
    await engine.run(work, [{
      id: "compose",
      operation: "compose",
      capability: "pack.messaging.outbox",
      input: f.input,
      idempotencyKey: "message-outbox:fixture",
      riskClass: "local_write"
    }]);

    assert.equal(work.status, "verified");
    const files = fs.readdirSync(f.dir);
    assert.equal(files.length, 1);
    const raw = fs.readFileSync(path.join(f.dir, files[0]), "utf8");
    assert.match(raw, /Message-ID: <[0-9a-f]{64}@workproof\.local>/);
    assert.match(raw, /From: ops@example\.com/);
    assert.match(raw, /To: customer@example\.com, audit@example\.com/);
    assert.match(raw, /Subject: Work complete/);
    assert.match(raw, /Line one\r\nLine two\r\n/);
    assert.ok(work.artifacts.some((a: any) => a.kind === "message-outbox-verification"));
  } finally {
    fs.rmSync(f.dir, { recursive: true, force: true });
  }
});

test("message outbox is deterministic and idempotent for the same payload", async () => {
  const f = fixture();
  try {
    const { registry } = setup();
    const capability = registry.get("pack.messaging.outbox");
    const first = await capability.execute({ operation: "compose", input: f.input }, { work: {}, effect: undefined, log: () => {} });
    const bytes1 = fs.readFileSync(path.join(f.dir, fs.readdirSync(f.dir)[0]), "utf8");
    const second = await capability.execute({ operation: "compose", input: f.input }, { work: {}, effect: undefined, log: () => {} });
    const bytes2 = fs.readFileSync(path.join(f.dir, fs.readdirSync(f.dir)[0]), "utf8");
    assert.equal(first.status, "accepted");
    assert.equal(second.status, "accepted");
    assert.equal(fs.readdirSync(f.dir).length, 1);
    assert.equal(bytes1, bytes2);
  } finally {
    fs.rmSync(f.dir, { recursive: true, force: true });
  }
});

test("message outbox rejects unsupported operations before writing", async () => {
  const f = fixture();
  try {
    const { registry } = setup();
    const capability = registry.get("pack.messaging.outbox");
    const result = await capability.execute({ operation: "send", input: f.input }, { work: {}, effect: undefined, log: () => {} });
    assert.equal(result.status, "rejected");
    assert.equal(fs.readdirSync(f.dir).length, 0);
  } finally {
    fs.rmSync(f.dir, { recursive: true, force: true });
  }
});

test("message outbox rejects header injection, malformed addresses, and oversized content", async () => {
  const f = fixture();
  try {
    const { registry } = setup();
    const capability = registry.get("pack.messaging.outbox");
    const context = { work: {}, effect: undefined, log: () => {} };

    const injection = await capability.execute({
      operation: "compose",
      input: { ...f.input, subject: "bad\r\nBcc: attacker@example.com" }
    }, context);
    assert.equal(injection.status, "rejected");

    const malformed = await capability.execute({
      operation: "compose",
      input: { ...f.input, to: ["not-an-email"] }
    }, context);
    assert.equal(malformed.status, "rejected");

    const oversized = await capability.execute({
      operation: "compose",
      input: { ...f.input, body: "x".repeat(1024 * 1024 + 1) }
    }, context);
    assert.equal(oversized.status, "rejected");

    assert.equal(fs.readdirSync(f.dir).length, 0);
  } finally {
    fs.rmSync(f.dir, { recursive: true, force: true });
  }
});

export {};
