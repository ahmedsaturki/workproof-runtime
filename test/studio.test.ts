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
    assert.match(page.headers.get("content-security-policy") ?? "", /default-src 'self'/i);
    assert.equal(page.headers.get("x-content-type-options"), "nosniff");
    assert.equal(page.headers.get("cache-control"), "no-store");

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


test("Studio control routes require a bearer token and delegate mutation to the authenticated control plane", async () => {
  const root = tempDir("workproof-studio-control-");
  const repo = new JsonWorkRepository(path.join(root, "work"));
  const work = workFixture();
  work.status = "running";
  repo.save(work);

  const auth = require("../packages/registry/src/auth.js");
  const controlPolicy = auth.createAuthPolicy();
  const reader = auth.issueCredential({ id: "studio-reader", permissions: ["read"] });
  const writer = auth.issueCredential({ id: "studio-writer", permissions: ["read", "write"] });
  const withReader = auth.addIssuedCredential(controlPolicy, reader);
  const controlAuth = auth.addIssuedCredential(withReader, writer);
  const auditPath = path.join(root, "audit.jsonl");

  const control = await require("../packages/control-plane/src/http.js").startControlPlane({
    repository: repo,
    authPolicy: controlAuth,
    auditPath,
    dispatch: async (input: Record<string, unknown>) => {
      const created = { ...workFixture(), id: "studio_dispatched", status: "new" };
      created.contract.objective = String(input.objective);
      repo.save(created);
      return created;
    },
    resume: async (persisted: any) => {
      persisted.status = "verified";
      persisted.events.push({
        id: "studio_resume",
        type: "control.resumed",
        at: new Date().toISOString(),
        message: "Resumed by Studio test"
      });
      persisted.updatedAt = persisted.events[persisted.events.length - 1].at;
      repo.save(persisted);
      return persisted;
    }
  });

  const studio = await startStudio({
    workDirectory: path.join(root, "work"),
    port: 0,
    controlPlaneUrl: `http://${control.host}:${control.port}`
  });

  try {
    const base = `http://127.0.0.1:${studio.port}`;
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).mode, "authenticated-control");

    const missing = await fetch(`${base}/api/control/work/${work.id}/cancel`, { method: "POST" });
    assert.equal(missing.status, 401);

    const readOnly = await fetch(`${base}/api/control/work/${work.id}/cancel`, {
      method: "POST",
      headers: { authorization: `Bearer ${reader.token}` }
    });
    assert.equal(readOnly.status, 403);

    const cancelled = await fetch(`${base}/api/control/work/${work.id}/cancel`, {
      method: "POST",
      headers: { authorization: `Bearer ${writer.token}` }
    });
    assert.equal(cancelled.status, 200);
    const cancelledBody = await cancelled.json();
    assert.equal(cancelledBody.work.status, "cancelled");
    assert.equal(cancelledBody.work.contract, undefined);
    assert.equal(cancelledBody.work.inputs, undefined);
    assert.equal(cancelledBody.work.constraints, undefined);
    assert.equal(cancelledBody.work.effects[0].idempotencyKey, undefined);

    const resumed = await fetch(`${base}/api/control/work/${work.id}/resume`, {
      method: "POST",
      headers: { authorization: `Bearer ${writer.token}` }
    });
    assert.equal(resumed.status, 200);
    const resumedBody = await resumed.json();
    assert.equal(resumedBody.work.status, "verified");

    const dispatched = await fetch(`${base}/api/control/dispatch`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${writer.token}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ objective: "Studio dispatched objective" })
    });
    assert.equal(dispatched.status, 200);
    const dispatchedBody = await dispatched.json();
    assert.equal(dispatchedBody.work.id, "studio_dispatched");
    assert.equal(dispatchedBody.work.objective, "Studio dispatched objective");
    assert.equal(dispatchedBody.work.contract, undefined);
    assert.equal(dispatchedBody.work.inputs, undefined);
    assert.equal(dispatchedBody.work.constraints, undefined);

    const audit = fs.readFileSync(auditPath, "utf8").trim().split("\n").map((line: string) => JSON.parse(line));
    assert.ok(audit.some((entry: Record<string, any>) => entry.reason === "permission-denied"));
    assert.ok(audit.some((entry: Record<string, any>) => entry.action === "cancel"));
    assert.ok(audit.some((entry: Record<string, any>) => entry.action === "resume"));
    assert.ok(audit.some((entry: Record<string, any>) => entry.action === "dispatch"));
    assert.ok(audit.every((entry: Record<string, any>) => typeof entry.requestId === "string"));
  } finally {
    await studio.close();
    await control.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});


test("Studio exposes retained proof audit metadata without vault paths", async () => {
  const root = tempDir("workproof-studio-proof-");
  const workRoot = path.join(root, "work");
  const vaultRoot = path.join(root, "vault");
  const repository = new JsonWorkRepository(workRoot);
  const auth = require("../packages/evidence/src/trust.js");
  const signing = require("../packages/evidence/src/signature.js");
  const proofApi = require("../packages/evidence/src/bundle.js");
  const integrityApi = require("../packages/evidence/src/integrity.js");
  const vaultApi = require("../packages/evidence/src/vault.js");

  const work = workFixture();
  repository.save(work);
  const pair = signing.generateProofKeyPair();
  const proof = proofApi.buildProofBundle(work);
  const integrity = integrityApi.buildIntegrityManifest(work);
  const signature = signing.signProof({ ...proof, integrity }, pair.privateKey);
  const proofPath = path.join(root, "proof.json");
  fs.writeFileSync(proofPath, JSON.stringify({ ...proof, integrity, signature }, null, 2), "utf8");
  const record = vaultApi.publishProof(proofPath, vaultRoot);

  const trustPolicy = auth.createTrustPolicy();
  auth.trustKey(trustPolicy, pair.publicKey, "studio-test");
  const trustPolicyPath = path.join(root, "trust.json");
  auth.saveTrustPolicy(trustPolicyPath, trustPolicy);

  const studio = await startStudio({
    workDirectory: workRoot,
    vaultDirectory: vaultRoot,
    trustPolicyPath,
    port: 0
  });

  try {
    const base = `http://127.0.0.1:${studio.port}`;
    const proofs = await fetch(`${base}/api/proofs?workId=${encodeURIComponent(work.id)}`);
    assert.equal(proofs.status, 200);
    const list = await proofs.json();
    assert.equal(list.proofs.length, 1);
    assert.equal(list.proofs[0].digest, record.digest);
    assert.equal(list.proofs[0].integrity, "verified");
    assert.equal(list.proofs[0].signature, "verified");
    assert.equal(list.proofs[0].trust, "trusted");
    assert.equal(list.proofs[0].proofPath, undefined);
    assert.equal(list.proofs[0]._vaultDirectory, undefined);

    const detail = await fetch(`${base}/api/proof/${record.digest}`);
    assert.equal(detail.status, 200);
    const body = await detail.json();
    assert.equal(body.proof.digest, record.digest);
    assert.equal(body.proof.workId, work.id);
    assert.equal(body.proof.integrity, "verified");
    assert.equal(body.proof.signature, "verified");
    assert.equal(body.proof.trust, "trusted");
    assert.equal(body.proof.proofPath, undefined);

    const missing = await fetch(`${base}/api/proof/${"0".repeat(64)}`);
    assert.equal(missing.status, 404);
  } finally {
    await studio.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("Studio proof audit reports corrupted retained proof as invalid", async () => {
  const root = tempDir("workproof-studio-proof-corrupt-");
  const workRoot = path.join(root, "work");
  const vaultRoot = path.join(root, "vault");
  const repository = new JsonWorkRepository(workRoot);
  const vaultApi = require("../packages/evidence/src/vault.js");
  const proofApi = require("../packages/evidence/src/bundle.js");
  const integrityApi = require("../packages/evidence/src/integrity.js");

  const work = workFixture();
  repository.save(work);
  const proof = proofApi.buildProofBundle(work);
  const integrity = integrityApi.buildIntegrityManifest(work);
  const proofPath = path.join(root, "proof.json");
  fs.writeFileSync(proofPath, JSON.stringify({ ...proof, integrity }, null, 2), "utf8");
  const record = vaultApi.publishProof(proofPath, vaultRoot);
  const retained = JSON.parse(fs.readFileSync(record.proofPath, "utf8"));
  retained.work.status = "failed";
  fs.writeFileSync(record.proofPath, JSON.stringify(retained, null, 2), "utf8");

  const studio = await startStudio({ workDirectory: workRoot, vaultDirectory: vaultRoot, port: 0 });
  try {
    const response = await fetch(`http://127.0.0.1:${studio.port}/api/proof/${record.digest}`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.proof.integrity, "invalid");
    assert.equal(body.proof.signature, "not-present");
  } finally {
    await studio.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("Studio proof APIs fail closed when the vault is not configured", async () => {
  const root = tempDir("workproof-studio-no-vault-");
  const studio = await startStudio({ workDirectory: root, port: 0 });
  try {
    const response = await fetch(`http://127.0.0.1:${studio.port}/api/proofs`);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error, "proof-vault-not-configured");
  } finally {
    await studio.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

export {};
