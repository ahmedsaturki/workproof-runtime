const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { JsonWorkRepository } = require("../packages/storage/src/json.js");
const { startStudio } = require("../apps/studio.js");

function tempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function workFixture() {
  return {
    id: "studio_work_1",
    contract: {
      objective: "<Operational Objective>",
      inputs: { secret: "do-not-expose" },
      constraints: { hidden: "do-not-expose" },
      success: [{ id: "s1", description: "state is verified" }],
      deliverables: ["report.json"],
      riskClass: "read",
      approvalRequired: false
    },
    status: "verified",
    effects: [{
      effectId: "effect_1",
      operation: "read",
      capability: "pack.local.read",
      riskClass: "read",
      status: "verified",
      attempts: 1,
      idempotencyKey: "internal-key-not-for-ui"
    }],
    artifacts: [{ uri: "file:///tmp/report.json", mediaType: "application/json" }],
    verification: {
      status: "verified",
      verifiedAt: "2026-09-21T00:00:00.000Z",
      checks: [{
        criterion: "state is verified",
        status: "passed",
        details: "independent check",
        evidence: [{ kind: "observed", uri: "https://example.invalid/state" }]
      }]
    },
    events: [{
      id: "event_1",
      type: "work.verified",
      at: "2026-09-21T00:00:00.000Z",
      message: "Verified"
    }],
    createdAt: "2026-09-21T00:00:00.000Z",
    updatedAt: "2026-09-21T00:00:00.000Z"
  };
}

test("Studio serves an operational dashboard and sanitized Work Object APIs", async () => {
  const root = tempDir("workproof-studio-");
  const repository = new JsonWorkRepository(root);
  repository.save(workFixture());
  const studio = await startStudio({ workDirectory: root, port: 0 });
  try {
    const base = `http://127.0.0.1:${studio.port}`;
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).mode, "read-only");

    const page = await fetch(base);
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.match(html, /WorkProof Studio/);
    assert.match(html, /content-security-policy/i);

    const list = await fetch(`${base}/api/work`);
    assert.equal(list.status, 200);
    const listData = await list.json();
    assert.equal(listData.work.length, 1);
    assert.equal(listData.work[0].id, "studio_work_1");

    const detail = await fetch(`${base}/api/work/studio_work_1`);
    assert.equal(detail.status, 200);
    const data = await detail.json();
    assert.equal(data.work.objective, "<Operational Objective>");
    assert.equal(data.work.effects[0].operation, "read");
    assert.equal(data.work.effects[0].idempotencyKey, undefined);
    assert.equal(data.work.contract, undefined);
    assert.equal(data.work.inputs, undefined);
    assert.equal(data.work.constraints, undefined);
    assert.match(data.work.verification.checks[0].details, /independent/);
  } finally {
    await studio.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("Studio rejects unknown work with a 404 and rejects unsupported methods", async () => {
  const root = tempDir("workproof-studio-empty-");
  const studio = await startStudio({ workDirectory: root, port: 0 });
  try {
    const base = `http://127.0.0.1:${studio.port}`;
    const missing = await fetch(`${base}/api/work/missing`);
    assert.equal(missing.status, 404);
    const wrongMethod = await fetch(base, { method: "POST" });
    assert.equal(wrongMethod.status, 404);
  } finally {
    await studio.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

export {};
