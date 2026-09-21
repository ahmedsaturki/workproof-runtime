const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const { startRegistryServer } = require("../packages/registry/src/http.js");
const { buildProofBundle } = require("../packages/evidence/src/bundle.js");
const { buildIntegrityManifest } = require("../packages/evidence/src/integrity.js");

function proofFixture() {
  const work = {
    id: "work_registry_e2e",
    contract: {
      objective: "registry e2e",
      success: [],
      deliverables: [],
      riskClass: "read"
    },
    status: "verified",
    effects: [],
    artifacts: [],
    verification: {
      status: "verified",
      checks: [],
      verifiedAt: "2026-09-21T00:00:00.000Z"
    },
    events: [],
    createdAt: "2026-09-21T00:00:00.000Z",
    updatedAt: "2026-09-21T00:00:00.000Z"
  };
  const proof = buildProofBundle(work);
  return { ...proof, integrity: buildIntegrityManifest(work) };
}

function request(port: number, method: string, requestPath: string, body?: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: "127.0.0.1",
      port,
      path: requestPath,
      method,
      headers: body === undefined
        ? {}
        : { "content-type": "application/json", "content-length": Buffer.byteLength(body) }
    }, (res: any) => {
      const chunks: any[] = [];
      res.on("data", (chunk: any) => chunks.push(chunk));
      res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString("utf8") }));
      res.on("error", reject);
    });
    req.on("error", reject);
    if (body !== undefined) req.write(body);
    req.end();
  });
}

function tempVault(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "workproof-registry-test-"));
}

test("self-hosted registry publishes, retrieves, lists, and idempotently republishes a proof", async () => {
  const vaultDir = tempVault();
  const registry = await startRegistryServer({ vaultDir, port: 0 });
  try {
    const proof = proofFixture();
    const payload = JSON.stringify(proof);

    const health = await request(registry.port, "GET", "/health");
    assert.equal(health.status, 200);
    assert.deepEqual(JSON.parse(health.body), { status: "ok", version: "1.2" });

    const first = await request(registry.port, "POST", "/v1/proofs", payload);
    assert.equal(first.status, 200);
    const firstBody = JSON.parse(first.body);
    assert.equal(firstBody.workId, "work_registry_e2e");
    assert.equal(firstBody.proof.integrity.digest, proof.integrity.digest);

    const second = await request(registry.port, "POST", "/v1/proofs", payload);
    assert.equal(second.status, 200);
    const secondBody = JSON.parse(second.body);
    assert.equal(secondBody.digest, firstBody.digest);

    const list = await request(registry.port, "GET", "/v1/proofs");
    assert.equal(list.status, 200);
    const records = JSON.parse(list.body).records;
    assert.equal(records.length, 1);
    assert.equal(records[0].digest, firstBody.digest);

    const record = await request(registry.port, "GET", `/v1/proofs/${firstBody.digest}`);
    assert.equal(record.status, 200);
    assert.equal(JSON.parse(record.body).record.digest, firstBody.digest);

    const content = await request(registry.port, "GET", `/v1/proofs/${firstBody.digest}/content`);
    assert.equal(content.status, 200);
    assert.deepEqual(JSON.parse(content.body), proof);
  } finally {
    await registry.close();
    fs.rmSync(vaultDir, { recursive: true, force: true });
  }
});

test("registry rejects malformed or invalid-integrity proofs before retention", async () => {
  const vaultDir = tempVault();
  const registry = await startRegistryServer({ vaultDir, port: 0 });
  try {
    const malformed = await request(registry.port, "POST", "/v1/proofs", "{not-json");
    assert.equal(malformed.status, 400);

    const invalid = proofFixture();
    invalid.work.status = "failed";
    const rejected = await request(registry.port, "POST", "/v1/proofs", JSON.stringify(invalid));
    assert.equal(rejected.status, 422);

    const list = await request(registry.port, "GET", "/v1/proofs");
    assert.equal(JSON.parse(list.body).records.length, 0);
  } finally {
    await registry.close();
    fs.rmSync(vaultDir, { recursive: true, force: true });
  }
});

test("registry rejects corrupted retained proof on egress", async () => {
  const vaultDir = tempVault();
  const registry = await startRegistryServer({ vaultDir, port: 0 });
  try {
    const proofFile = path.join(vaultDir, "input.json");
    const proof = proofFixture();
    fs.writeFileSync(proofFile, JSON.stringify(proof), "utf8");

    const publish = await request(registry.port, "POST", "/v1/proofs", JSON.stringify(proof));
    assert.equal(publish.status, 200);
    const digest = JSON.parse(publish.body).digest;
    const retainedPath = path.join(vaultDir, "proofs", `${digest}.json`);
    fs.writeFileSync(retainedPath, JSON.stringify({ ...proof, work: { ...proof.work, status: "failed" } }), "utf8");

    const corrupted = await request(registry.port, "GET", `/v1/proofs/${digest}/content`);
    assert.equal(corrupted.status, 422);
    assert.match(corrupted.body, /integrity|digest/i);
  } finally {
    await registry.close();
    fs.rmSync(vaultDir, { recursive: true, force: true });
  }
});

export {};

test("registry returns 404 for a syntactically valid but unknown proof digest", async () => {
  const vaultDir = tempVault();
  const registry = await startRegistryServer({ vaultDir, port: 0 });
  try {
    const missing = await request(registry.port, "GET", `/v1/proofs/${"a".repeat(64)}`);
    assert.equal(missing.status, 404);
    assert.match(missing.body, /Unknown proof digest|not-found/i);
  } finally {
    await registry.close();
    fs.rmSync(vaultDir, { recursive: true, force: true });
  }
});
