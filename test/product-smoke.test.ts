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

function fixture() {
  return {
    id: "product_smoke_restart",
    contract: {
      objective: "Product smoke persistence check",
      inputs: {},
      constraints: {},
      success: [{ id: "smoke", description: "persisted Work Object remains readable" }],
      deliverables: ["smoke-proof.json"],
      riskClass: "read",
      approvalRequired: false
    },
    status: "verified",
    effects: [{
      effectId: "smoke_effect",
      operation: "read",
      capability: "pack.local.read",
      riskClass: "read",
      status: "verified",
      attempts: 1,
      idempotencyKey: "internal-smoke-key"
    }],
    artifacts: [{ uri: "file:///tmp/smoke-proof.json", mediaType: "application/json" }],
    verification: {
      status: "verified",
      verifiedAt: "2026-09-22T00:00:00.000Z",
      checks: [{
        criterion: "persisted Work Object remains readable",
        status: "passed",
        details: "product smoke fixture",
        evidence: [{ kind: "observed", uri: "file:///tmp/smoke-proof.json" }]
      }]
    },
    events: [{
      id: "smoke_event",
      type: "work.verified",
      at: "2026-09-22T00:00:00.000Z",
      message: "Verified"
    }],
    createdAt: "2026-09-22T00:00:00.000Z",
    updatedAt: "2026-09-22T00:00:00.000Z"
  };
}

test("local product smoke boots Studio, reports release version, serves work, and survives restart", async () => {
  const root = tempDir("workproof-product-smoke-");
  const repository = new JsonWorkRepository(root);
  repository.save(fixture());

  const packageJson = JSON.parse(
    fs.readFileSync(path.resolve(path.dirname(__filename), "../../package.json"), "utf8")
  );
  assert.equal(packageJson.bin?.workctl, "dist/packages/cli/src/index.js");
  const compiledCli = fs.readFileSync(path.resolve(path.dirname(__filename), "../packages/cli/src/index.js"), "utf8");
  assert.match(compiledCli, /^#!\\/usr\\/bin\\/env node\\n/);

  const first = await startStudio({ workDirectory: root, host: "127.0.0.1", port: 0 });
  try {
    const base = "http://" + first.host + ":" + first.port;

    const health = await fetch(base + "/health");
    assert.equal(health.status, 200);
    const healthBody = await health.json();
    assert.equal(healthBody.status, "ok");
    assert.equal(healthBody.version, packageJson.version);
    assert.equal(healthBody.mode, "read-only");

    const page = await fetch(base);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /WorkProof Studio/);

    const list = await fetch(base + "/api/work?status=verified&limit=10");
    assert.equal(list.status, 200);
    const listBody = await list.json();
    assert.equal(listBody.total, 1);
    assert.equal(listBody.work[0].id, "product_smoke_restart");
    assert.equal(listBody.work[0].status, "verified");
    assert.equal(listBody.work[0].riskClass, "read");
  } finally {
    await first.close();
  }

  const second = await startStudio({ workDirectory: root, host: "127.0.0.1", port: 0 });
  try {
    const base = "http://" + second.host + ":" + second.port;

    const health = await fetch(base + "/health");
    assert.equal(health.status, 200);
    assert.equal((await health.json()).version, packageJson.version);

    const detail = await fetch(base + "/api/work/product_smoke_restart");
    assert.equal(detail.status, 200);
    const body = await detail.json();
    assert.equal(body.work.id, "product_smoke_restart");
    assert.equal(body.work.status, "verified");
    assert.equal(body.work.effects[0].idempotencyKey, undefined);
    assert.equal(body.work.contract, undefined);
    assert.equal(body.work.inputs, undefined);
    assert.equal(body.work.constraints, undefined);
  } finally {
    await second.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

export {};
