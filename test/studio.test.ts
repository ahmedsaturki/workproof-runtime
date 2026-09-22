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
    assert.match(html, /Operator guidance/);
    assert.match(html, /Effect summary/);
    assert.match(html, /Capability chain/);
    assert.match(html, /Operational timeline/);
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
    assert.equal(data.work.operatorGuidance.level, "success");
    assert.equal(data.work.operatorGuidance.title, "Outcome verified");
    assert.equal(data.work.effectsSummary.total, 1);
    assert.equal(data.work.effectsSummary.verified, 1);
    assert.equal(data.work.capabilityChain[0].capability, "pack.local.read");
    assert.equal(data.work.capabilityChain[0].sequence, 1);
    assert.equal(data.work.events[0].type, "work.verified");
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

test("Studio detail binds selected Work Object for control actions", async () => {
  const root = tempDir("workproof-studio-selection-");
  const repository = new JsonWorkRepository(root);
  repository.save(workFixture());
  const studio = await startStudio({ workDirectory: root, port: 0 });
  try {
    const page = await fetch(`http://127.0.0.1:${studio.port}`);
    const html = await page.text();
    assert.match(html, /selectedId = id/);
    assert.match(html, /id="timeline"/);
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


test("Studio exposes sanitized worker liveness without becoming a mutation authority", async () => {
  const root = tempDir("workproof-studio-workers-");
  const workerStatuses = [
    {
      version: "0.1",
      workerId: "worker-active",
      capabilities: ["github.read", "browser"],
      state: "active",
      registeredAt: "2026-09-21T00:00:00.000Z",
      lastHeartbeatAt: "2026-09-21T00:00:00.000Z",
      liveness: "active",
      heartbeatAgeMs: 10,
      staleAfterMs: 1000,
      reassignmentEligible: false
    },
    {
      version: "0.1",
      workerId: "worker-stale",
      capabilities: ["github.read"],
      state: "active",
      registeredAt: "2026-09-21T00:00:00.000Z",
      lastHeartbeatAt: "2026-09-20T23:59:00.000Z",
      liveness: "stale",
      heartbeatAgeMs: 61000,
      staleAfterMs: 1000,
      reassignmentEligible: true
    },
    {
      version: "0.1",
      workerId: "worker-offline",
      capabilities: ["browser"],
      state: "offline",
      registeredAt: "2026-09-21T00:00:00.000Z",
      lastHeartbeatAt: "2026-09-20T23:58:00.000Z",
      liveness: "offline",
      heartbeatAgeMs: 122000,
      staleAfterMs: 1000,
      reassignmentEligible: true
    }
  ];

  const studio = await startStudio({
    workDirectory: root,
    port: 0,
    workerStatusSource: {
      listWorkerStatuses: () => workerStatuses
    },
    workerStaleAfterMs: 1000
  });

  try {
    const base = `http://127.0.0.1:${studio.port}`;
    const response = await fetch(`${base}/api/workers`);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.version, "2.6");
    assert.equal(data.staleAfterMs, 1000);
    assert.deepEqual(data.workers.map((worker: any) => worker.workerId), [
      "worker-active",
      "worker-stale",
      "worker-offline"
    ]);
    assert.equal(data.workers[1].liveness, "stale");
    assert.equal(data.workers[2].liveness, "offline");
    assert.equal(data.workers[0].reassignmentEligible, false);
    assert.equal(data.workers[1].reassignmentEligible, true);
    assert.equal(data.workers[0].metadata, undefined);
    assert.equal(data.workers[0].leaseId, undefined);

    const page = await fetch(base);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Workers/);
  } finally {
    await studio.close();
    fs.rmSync(root, { recursive: true, force: true });
  }

  const unconfiguredRoot = tempDir("workproof-studio-workers-off-");
  const unconfigured = await startStudio({
    workDirectory: unconfiguredRoot,
    port: 0
  });
  try {
    const response = await fetch(`http://127.0.0.1:${unconfigured.port}/api/workers`);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error, "worker-status-not-configured");
  } finally {
    await unconfigured.close();
    fs.rmSync(unconfiguredRoot, { recursive: true, force: true });
  }
});


test("Studio proxies worker liveness through the authenticated control plane without local authority", async () => {
  const root = tempDir("workproof-studio-remote-workers-");
  const controlRoot = path.join(root, "control-work");
  const studioRoot = path.join(root, "studio-work");
  const repo = new JsonWorkRepository(controlRoot);
  const auth = require("../packages/registry/src/auth.js");
  const policy = auth.createAuthPolicy();
  const reader = auth.issueCredential({ id: "worker-reader", permissions: ["read"] });
  const controlPolicy = auth.addIssuedCredential(policy, reader);
  const coordination = require("../packages/coordination/src/leases.js");
  const workers = new coordination.LeaseStore();
  workers.registerWorker({ workerId: "remote-worker", capabilities: ["github.read"] });

  const control = await require("../packages/control-plane/src/http.js").startControlPlane({
    repository: repo,
    authPolicy: controlPolicy,
    workerStatusSource: workers,
    workerStaleAfterMs: 750
  });

  const studio = await startStudio({
    workDirectory: studioRoot,
    port: 0,
    controlPlaneUrl: `http://127.0.0.1:${control.port}`
  });

  try {
    const base = `http://127.0.0.1:${studio.port}`;
    const missing = await fetch(`${base}/api/workers`);
    assert.equal(missing.status, 401);
    assert.equal((await missing.json()).error, "unauthorized");

    const response = await fetch(`${base}/api/workers`, {
      headers: { authorization: `Bearer ${reader.token}` }
    });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.version, "2.7");
    assert.equal(data.source, "control-plane");
    assert.equal(data.staleAfterMs, 750);
    assert.equal(data.workers.length, 1);
    assert.equal(data.workers[0].workerId, "remote-worker");
    assert.equal(data.workers[0].liveness, "active");
    assert.equal(data.workers[0].leaseId, undefined);
    assert.equal(data.workers[0].metadata, undefined);
  } finally {
    await studio.close();
    await control.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("Studio reports an unavailable remote control plane as 503", async () => {
  const root = tempDir("workproof-studio-remote-unavailable-");
  const studio = await startStudio({
    workDirectory: root,
    port: 0,
    controlPlaneUrl: "http://127.0.0.1:1"
  });
  try {
    const response = await fetch(`http://127.0.0.1:${studio.port}/api/workers`, {
      headers: { authorization: "Bearer unavailable-test" }
    });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error, "control-plane-unavailable");
  } finally {
    await studio.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});


test("Studio exposes a deterministic operational health projection and attention queue", async () => {
  const root = tempDir("workproof-studio-health-");
  const repository = new JsonWorkRepository(root);

  const verified = workFixture();
  verified.id = "health-verified";
  verified.updatedAt = "2026-09-21T01:00:00.000Z";

  const failed = workFixture();
  failed.id = "health-failed";
  failed.status = "failed";
  failed.updatedAt = "2026-09-21T02:00:00.000Z";
  failed.verification = {
    status: "failed",
    verifiedAt: "2026-09-21T02:00:00.000Z",
    checks: [{
      criterion: "state is verified",
      status: "failed",
      details: "verification failed",
      evidence: []
    }]
  };

  const ambiguous = workFixture();
  ambiguous.id = "health-ambiguous";
  ambiguous.status = "running";
  ambiguous.updatedAt = "2026-09-21T03:00:00.000Z";
  ambiguous.effects = [{
    ...ambiguous.effects[0],
    effectId: "effect-ambiguous",
    status: "unknown"
  }];

  const partial = workFixture();
  partial.id = "health-partial";
  partial.status = "partial";
  partial.updatedAt = "2026-09-21T04:00:00.000Z";
  partial.verification = {
    status: "partial",
    verifiedAt: "2026-09-21T04:00:00.000Z",
    checks: [{
      criterion: "state is verified",
      status: "failed",
      details: "partial evidence",
      evidence: []
    }]
  };

  for (const work of [verified, failed, ambiguous, partial]) repository.save(work);

  const workerStatuses = [
    {
      version: "0.1",
      workerId: "health-active",
      capabilities: ["github.read"],
      state: "active",
      registeredAt: "2026-09-21T00:00:00.000Z",
      lastHeartbeatAt: "2026-09-21T04:00:00.000Z",
      liveness: "active",
      heartbeatAgeMs: 10,
      staleAfterMs: 1000,
      reassignmentEligible: false
    },
    {
      version: "0.1",
      workerId: "health-stale",
      capabilities: ["browser"],
      state: "active",
      registeredAt: "2026-09-21T00:00:00.000Z",
      lastHeartbeatAt: "2026-09-21T03:00:00.000Z",
      liveness: "stale",
      heartbeatAgeMs: 61000,
      staleAfterMs: 1000,
      reassignmentEligible: true
    }
  ];

  const leaseStatuses = [
    {
      version: "0.1",
      leaseId: "health-lease-active",
      resourceId: "health-resource-1",
      ownerId: "health-active",
      acquiredAt: "2026-09-21T03:00:00.000Z",
      renewedAt: "2026-09-21T04:00:00.000Z",
      expiresAt: "2026-09-21T05:00:00.000Z",
      revision: 2,
      active: true
    },
    {
      version: "0.1",
      leaseId: "health-lease-expired",
      resourceId: "health-resource-2",
      ownerId: "health-stale",
      acquiredAt: "2026-09-21T01:00:00.000Z",
      renewedAt: "2026-09-21T01:30:00.000Z",
      expiresAt: "2026-09-21T02:00:00.000Z",
      revision: 1,
      active: false
    }
  ];

  const studio = await startStudio({
    workDirectory: root,
    port: 0,
    workerStatusSource: {
      listWorkerStatuses: () => workerStatuses
    },
    leaseStatusSource: {
      listLeaseStatuses: () => leaseStatuses
    }
  });

  try {
    const base = `http://127.0.0.1:${studio.port}`;
    const response = await fetch(`${base}/api/operations/overview`);
    assert.equal(response.status, 200);
    const data = await response.json();

    assert.equal(data.version, "3.0");
    assert.equal(data.work.total, 4);
    assert.equal(data.work.verified, 1);
    assert.equal(data.work.byStatus.verified, 1);
    assert.equal(data.work.byStatus.failed, 1);
    assert.equal(data.work.byStatus.running, 1);
    assert.equal(data.work.byStatus.partial, 1);

    assert.equal(data.effects.total, 4);
    assert.equal(data.effects.byStatus.verified, 3);
    assert.equal(data.effects.byStatus.unknown, 1);
    assert.equal(data.effects.attention, 1);

    assert.equal(data.verification.byStatus.verified, 2);
    assert.equal(data.verification.byStatus.failed, 1);
    assert.equal(data.verification.byStatus.partial, 1);
    assert.equal(data.verification.notVerified, 3);

    assert.equal(data.workers.configured, true);
    assert.equal(data.workers.total, 2);
    assert.equal(data.workers.byLiveness.active, 1);
    assert.equal(data.workers.byLiveness.stale, 1);
    assert.equal(data.workers.reassignmentEligible, 1);

    assert.equal(data.leases.configured, true);
    assert.equal(data.leases.total, 2);
    assert.equal(data.leases.active, 1);
    assert.equal(data.leases.expired, 1);

    assert.equal(data.attention.total, 3);
    assert.equal(data.attention.byReason["work-failed"], 1);
    assert.equal(data.attention.byReason["effect-unknown"], 1);
    assert.equal(data.attention.byReason["work-partial"], 1);
    assert.equal(data.attention.byReason["verification-failed"], 1);
    assert.equal(data.attention.byReason["verification-partial"], 1);
    assert.deepEqual(data.attention.items.map((item: any) => item.workId), [
      "health-partial",
      "health-ambiguous",
      "health-failed"
    ]);

    const persistedBefore = JSON.stringify(repository.load("health-ambiguous"));
    const second = await fetch(`${base}/api/operations/overview`);
    assert.equal(second.status, 200);
    const secondData = await second.json();
    assert.deepEqual(secondData, data);
    assert.equal(JSON.stringify(repository.load("health-ambiguous")), persistedBefore);
  } finally {
    await studio.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("Studio work API supports safe search, status/risk filters, limits, and operational summaries", async () => {
  const root = tempDir("workproof-studio-filters-");
  const repository = new JsonWorkRepository(root);
  const verified = workFixture();
  verified.id = "verified-external";
  verified.contract.objective = "External integration verified";
  verified.contract.riskClass = "external_write";
  verified.status = "verified";

  const running = { ...workFixture(), id: "running-local", status: "running" };
  running.contract.objective = "Local running task";
  running.contract.riskClass = "local_write";

  const failed = { ...workFixture(), id: "failed-read", status: "failed" };
  failed.contract.objective = "Read task failed";
  failed.contract.riskClass = "read";

  const hidden = { ...workFixture(), id: "financial-hidden", status: "partial" };
  hidden.contract.objective = "Financial review";
  hidden.contract.riskClass = "financial";

  for (const work of [verified, running, failed, hidden]) repository.save(work);

  const studio = await startStudio({ workDirectory: root, port: 0 });
  try {
    const base = `http://127.0.0.1:${studio.port}`;

    const search = await fetch(`${base}/api/work?q=external`);
    assert.equal(search.status, 200);
    const searchData = await search.json();
    assert.equal(searchData.version, "2.9");
    assert.equal(searchData.total, 1);
    assert.deepEqual(searchData.filters, { q: "external", status: null, risk: null, limit: 100 });
    assert.equal(searchData.work[0].id, "verified-external");

    const filtered = await fetch(`${base}/api/work?status=verified&risk=external_write`);
    assert.equal(filtered.status, 200);
    const filteredData = await filtered.json();
    assert.equal(filteredData.total, 1);
    assert.equal(filteredData.byStatus.verified, 1);
    assert.equal(filteredData.byRisk.external_write, 1);
    assert.equal(filteredData.work[0].riskClass, "external_write");

    const limited = await fetch(`${base}/api/work?limit=2`);
    assert.equal(limited.status, 200);
    const limitedData = await limited.json();
    assert.equal(limitedData.total, 4);
    assert.equal(limitedData.work.length, 2);

    const summary = await fetch(`${base}/api/work?q=task`);
    assert.equal(summary.status, 200);
    const summaryData = await summary.json();
    assert.equal(summaryData.total, 2);
    assert.equal(summaryData.byStatus.running, 1);
    assert.equal(summaryData.byStatus.failed, 1);
    assert.equal(summaryData.byRisk.local_write, 1);
    assert.equal(summaryData.byRisk.read, 1);

    const invalidStatus = await fetch(`${base}/api/work?status=made_up`);
    assert.equal(invalidStatus.status, 400);
    assert.equal((await invalidStatus.json()).error, "invalid-status");

    const invalidRisk = await fetch(`${base}/api/work?risk=made_up`);
    assert.equal(invalidRisk.status, 400);
    assert.equal((await invalidRisk.json()).error, "invalid-risk");

    const invalidLimit = await fetch(`${base}/api/work?limit=0`);
    assert.equal(invalidLimit.status, 400);
    assert.equal((await invalidLimit.json()).error, "invalid-limit");

    const tooLongQuery = await fetch(`${base}/api/work?q=${"x".repeat(201)}`);
    assert.equal(tooLongQuery.status, 400);
    assert.equal((await tooLongQuery.json()).error, "query-too-long");

    const page = await fetch(base);
    const html = await page.text();
    assert.match(html, /Work filters/);
    assert.match(html, /workQuery/);
    assert.match(html, /workStatus/);
    assert.match(html, /workRisk/);
  } finally {
    await studio.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});


test("Studio operational overview reports bounded scanning and explicit truncation", async () => {
  const root = tempDir("workproof-studio-health-bound-");
  const repository = new JsonWorkRepository(root);
  const fixture = workFixture();
  for (let i = 0; i < 10001; i += 1) {
    const work = { ...fixture, id: `bound-${String(i).padStart(5, "0")}` };
    work.contract = { ...fixture.contract, objective: `Bounded work ${i}` };
    repository.save(work);
  }

  const studio = await startStudio({ workDirectory: root, port: 0 });
  try {
    const response = await fetch(`http://127.0.0.1:${studio.port}/api/operations/overview`);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.version, "3.0");
    assert.equal(data.work.sourceFiles, 10001);
    assert.equal(data.work.scannedFiles, 10000);
    assert.equal(data.work.total, 10000);
    assert.equal(data.work.truncated, true);
    assert.equal(data.attention.items.length <= 100, true);
  } finally {
    await studio.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("Studio operational overview fails soft when optional worker or lease health sources throw", async () => {
  const root = tempDir("workproof-studio-health-soft-");
  const repository = new JsonWorkRepository(root);
  repository.save(workFixture());

  const studio = await startStudio({
    workDirectory: root,
    port: 0,
    workerStatusSource: {
      listWorkerStatuses: () => { throw new Error("worker source down"); }
    },
    leaseStatusSource: {
      listLeaseStatuses: () => { throw new Error("lease source down"); }
    }
  });

  try {
    const response = await fetch(`http://127.0.0.1:${studio.port}/api/operations/overview`);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.work.total, 1);
    assert.equal(data.workers.configured, true);
    assert.equal(data.workers.available, false);
    assert.equal(data.workers.total, undefined);
    assert.equal(data.workers.byLiveness, undefined);
    assert.equal(data.leases.configured, true);
    assert.equal(data.leases.available, false);
    assert.equal(data.leases.total, undefined);
    assert.equal(data.leases.active, undefined);
  } finally {
    await studio.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("Studio provides actionable guidance for unresolved work and blocks unsafe resume affordance", async () => {
  const root = tempDir("workproof-studio-guidance-");
  const repository = new JsonWorkRepository(root);
  const work = workFixture();
  work.id = "studio_unresolved";
  work.status = "unresolved";
  work.effects[0].status = "unknown";
  repository.save(work);
  const studio = await startStudio({ workDirectory: root, port: 0 });
  try {
    const base = "http://127.0.0.1:" + studio.port;
    const detail = await fetch(base + "/api/work/studio_unresolved");
    assert.equal(detail.status, 200);
    const data = await detail.json();
    assert.equal(data.work.operatorGuidance.level, "critical");
    assert.equal(data.work.operatorGuidance.title, "External outcome is unresolved");
    assert.match(data.work.operatorGuidance.action, /Reconcile existing external state/);
    assert.equal(data.work.effectsSummary.unknown, 1);
    const page = await fetch(base);
    const html = await page.text();
    assert.match(html, /Operator guidance/);
    assert.match(html, /Effect summary/);
  } finally {
    await studio.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});


test("Studio refuses non-loopback binding because read-only Work Objects and proof must stay behind an authenticated edge", async () => {
  const root = tempDir("workproof-studio-bind-");
  await assert.rejects(
    () => startStudio({ workDirectory: root, host: "0.0.0.0", port: 0 }),
    /non-loopback Studio binding/
  );
  fs.rmSync(root, { recursive: true, force: true });
});

test("Studio permits explicit non-loopback binding for container-internal listening", async () => {
  const root = tempDir("workproof-studio-bind-allowed-");
  const studio = await startStudio({
    workDirectory: root,
    host: "0.0.0.0",
    port: 0,
    allowNonLoopback: true
  });
  try {
    const response = await fetch(`http://127.0.0.1:${studio.port}/health`);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).status, "ok");
  } finally {
    await studio.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

export {};


test("Studio exposes the connected control-plane capability registry", async () => {
  const root = tempDir("workproof-studio-capabilities-");
  const repo = new JsonWorkRepository(root);
  const auth = require("../packages/registry/src/auth.js");
  const policy = auth.createAuthPolicy();
  const credential = auth.issueCredential({ id: "studio-reader", permissions: ["read"] });
  const authPolicy = auth.addIssuedCredential(policy, credential);
  const controlApi = require("../packages/control-plane/src/http.js");

  const control = await controlApi.startControlPlane({
    repository: repo,
    authPolicy,
    runtimeVersion: "3.5-test",
    capabilitySource: {
      listCapabilities: () => [
        { name: "z.cap", version: "1.0.0", operations: ["z"], riskClass: "read" },
        { name: "a.cap", version: "2.0.0", operations: ["a"], riskClass: "local_write" }
      ]
    }
  });

  const studio = await startStudio({
    workDirectory: root,
    port: 0,
    controlPlaneUrl: "http://" + control.host + ":" + control.port
  });

  try {
    const base = "http://127.0.0.1:" + studio.port;
    const response = await fetch(base + "/api/capabilities", {
      headers: { authorization: "Bearer " + credential.token }
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body.capabilities, [
      { name: "a.cap", version: "2.0.0", operations: ["a"], riskClass: "local_write" },
      { name: "z.cap", version: "1.0.0", operations: ["z"], riskClass: "read" }
    ]);

    const page = await fetch(base);
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.match(html, /Capability registry/);
  } finally {
    await studio.close();
    await control.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});
