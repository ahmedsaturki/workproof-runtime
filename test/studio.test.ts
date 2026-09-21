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

export {};
