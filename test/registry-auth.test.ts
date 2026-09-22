const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { startRegistryServer } = require("../packages/registry/src/http.js");
const { createAuthPolicy, issueCredential, addIssuedCredential, revokeCredential, hashToken } = require("../packages/registry/src/auth.js");
const { hardenPrivateFile } = require("../packages/storage/src/private-file.js");
const { buildProofBundle } = require("../packages/evidence/src/bundle.js");
const { buildIntegrityManifest } = require("../packages/evidence/src/integrity.js");
import type { RegistryAuthPolicy, IssuedCredential, RegistryPermission } from "../packages/registry/src/auth";
const { publishProofToRegistry, getProofFromRegistry, listProofsFromRegistry } = require("../packages/registry/src/client.js");

function proofFixture(id: string = "work_auth"): Record<string, any> {
  const work = {
    id,
    contract: { objective: "authenticated registry", success: [], deliverables: [], riskClass: "read" },
    status: "verified",
    effects: [],
    artifacts: [],
    verification: { status: "verified", checks: [], verifiedAt: "2026-09-21T00:00:00.000Z" },
    events: [],
    createdAt: "2026-09-21T00:00:00.000Z",
    updatedAt: "2026-09-21T00:00:00.000Z"
  };
  const proof = buildProofBundle(work);
  return { ...proof, integrity: buildIntegrityManifest(work) };
}

function request(port: number, method: string, requestPath: string, body?: unknown, token?: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const req = require("http").request({
      host: "127.0.0.1",
      port,
      path: requestPath,
      method,
      headers: {
        ...(payload === undefined ? {} : { "content-type": "application/json", "content-length": Buffer.byteLength(payload) }),
        ...(token ? { authorization: `Bearer ${token}` } : {})
      }
    }, (res: any) => {
      const chunks: any[] = [];
      res.on("data", (chunk: any) => chunks.push(chunk));
      res.on("end", () => resolve({
        status: res.statusCode,
        body: JSON.parse(Buffer.concat(chunks).toString("utf8"))
      }));
      res.on("error", reject);
    });
    req.on("error", reject);
    if (payload !== undefined) req.write(payload);
    req.end();
  });
}

function tempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function withCredential(policy: RegistryAuthPolicy, args: { id: string; permissions: RegistryPermission[]; namespace?: string; label?: string }): { issued: IssuedCredential; policy: RegistryAuthPolicy } {
  const issued = issueCredential(args);
  return { issued, policy: addIssuedCredential(policy, issued) };
}

test("private file hardening uses platform-appropriate permissions", () => {
  const root = tempDir("workproof-private-file-");
  const file = path.join(root, "secret.json");
  fs.writeFileSync(file, "secret\n", "utf8");
  try {
    hardenPrivateFile(file);
    if (require("process").platform !== "win32") {
      assert.equal(fs.statSync(file).mode & 0o777, 0o600);
      return;
    }

    const systemRoot = require("process").env.SystemRoot;
    const whoami = path.join(systemRoot, "System32", "whoami.exe");
    const icacls = path.join(systemRoot, "System32", "icacls.exe");
    const childProcess = require("child_process");
    const identity = childProcess.spawnSync(whoami, ["/user", "/fo", "csv", "/nh"], { encoding: "utf8", windowsHide: true });
    assert.equal(identity.status, 0, identity.stderr || identity.stdout);
    const sid = /"[^"]*","(S-[0-9-]+)"/.exec(String(identity.stdout ?? "").trim())?.[1];
    assert.ok(sid);

    const verify = childProcess.spawnSync(icacls, [file, "/verify"], { encoding: "utf8", windowsHide: true });
    assert.equal(verify.status, 0, verify.stderr || verify.stdout);

    const userMatch = childProcess.spawnSync(icacls, [file, "/findsid", `*${sid}`], { encoding: "utf8", windowsHide: true });
    assert.equal(userMatch.status, 0, userMatch.stderr || userMatch.stdout);
    assert.match(String(userMatch.stdout ?? ""), /secret\.json/i);

    const systemMatch = childProcess.spawnSync(icacls, [file, "/findsid", "*S-1-5-18"], { encoding: "utf8", windowsHide: true });
    assert.equal(systemMatch.status, 0, systemMatch.stderr || systemMatch.stdout);
    assert.match(String(systemMatch.stdout ?? ""), /secret\.json/i);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
test("authenticated registry separates public health from protected proof operations", async () => {
  const root = tempDir("workproof-auth-");
  const base = createAuthPolicy();
  const reader = withCredential(base, { id: "reader", permissions: ["read"], namespace: "team-a" });
  const writer = withCredential(reader.policy, { id: "writer", permissions: ["write"], namespace: "team-a" });
  const registry = await startRegistryServer({ vaultDir: root, port: 0, authPolicy: writer.policy });
  try {
    const health = await request(registry.port, "GET", "/health");
    assert.equal(health.status, 200);

    const unauthenticated = await request(registry.port, "GET", "/v1/proofs");
    assert.equal(unauthenticated.status, 401);

    const writeDenied = await request(registry.port, "POST", "/v1/proofs", proofFixture(), reader.issued.token);
    assert.equal(writeDenied.status, 403);

    const readDenied = await request(registry.port, "GET", "/v1/proofs", undefined, writer.issued.token);
    assert.equal(readDenied.status, 403);

    const published = await request(registry.port, "POST", "/v1/proofs", proofFixture(), writer.issued.token);
    assert.equal(published.status, 200);

    const listed = await request(registry.port, "GET", "/v1/proofs", undefined, reader.issued.token);
    assert.equal(listed.status, 200);
    assert.equal(listed.body.records.length, 1);
  } finally {
    await registry.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("namespace credentials isolate proof storage and retain no plaintext token in audit log", async () => {
  const root = tempDir("workproof-auth-");
  const base = createAuthPolicy();
  const teamA = withCredential(base, { id: "team-a-writer", permissions: ["read", "write"], namespace: "team-a" });
  const teamB = withCredential(teamA.policy, { id: "team-b-reader", permissions: ["read"], namespace: "team-b" });
  const registry = await startRegistryServer({ vaultDir: root, port: 0, authPolicy: teamB.policy });
  try {
    const proofA = proofFixture("work_team_a");
    const published = await request(registry.port, "POST", "/v1/proofs", proofA, teamA.issued.token);
    assert.equal(published.status, 200);

    const bList = await request(registry.port, "GET", "/v1/proofs", undefined, teamB.issued.token);
    assert.equal(bList.status, 200);
    assert.equal(bList.body.records.length, 0);

    const aList = await request(registry.port, "GET", "/v1/proofs", undefined, teamA.issued.token);
    assert.equal(aList.status, 200);
    assert.equal(aList.body.records.length, 1);

    const auditPath = path.join(root, "auth-events.jsonl");
    if (require("process").platform !== "win32") assert.equal(fs.statSync(auditPath).mode & 0o777, 0o600);
    const audit = fs.readFileSync(auditPath, "utf8");
    assert.ok(audit.includes('"credentialId":"team-a-writer"'));
    assert.ok(audit.includes('"credentialId":"team-b-reader"'));
    assert.ok(!audit.includes(teamA.issued.token));
    assert.ok(!audit.includes(teamB.issued.token));
    assert.equal(hashToken(teamA.issued.token).length, 64);
  } finally {
    await registry.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("revoked credentials are denied immediately while cryptographic token material remains hashed", async () => {
  const root = tempDir("workproof-auth-");
  const base = createAuthPolicy();
  const issued = withCredential(base, { id: "revokable", permissions: ["read"] });
  const registry = await startRegistryServer({ vaultDir: root, port: 0, authPolicy: issued.policy });
  try {
    const before = await request(registry.port, "GET", "/v1/proofs", undefined, issued.issued.token);
    assert.equal(before.status, 200);

    revokeCredential(issued.policy, "revokable", "manual test");
    const after = await request(registry.port, "GET", "/v1/proofs", undefined, issued.issued.token);
    assert.equal(after.status, 403);
    assert.equal(after.body.error, "forbidden");

    assert.equal(issued.policy.credentials[0].secretHash, hashToken(issued.issued.token));
    assert.notEqual(issued.policy.credentials[0].secretHash, issued.issued.token);
  } finally {
    await registry.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("invalid bearer credentials are rejected without disclosing authorization details", async () => {
  const root = tempDir("workproof-auth-");
  const base = createAuthPolicy();
  const issued = withCredential(base, { id: "reader", permissions: ["read"] });
  const registry = await startRegistryServer({ vaultDir: root, port: 0, authPolicy: issued.policy });
  try {
    const invalid = await request(registry.port, "GET", "/v1/proofs", undefined, "totally-invalid-token");
    assert.equal(invalid.status, 401);
    assert.equal(invalid.body.error, "unauthorized");
    assert.ok(typeof invalid.body.requestId === "string");
    assert.equal(JSON.stringify(invalid.body).includes("reader"), false);
  } finally {
    await registry.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

export {};

test("registry client sends bearer authorization and enforces namespace-scoped access", async () => {
  const root = tempDir("workproof-auth-client-");
  const base = createAuthPolicy();
  const writer = withCredential(base, { id: "writer", permissions: ["read", "write"], namespace: "client-a" });
  const registry = await startRegistryServer({ vaultDir: root, port: 0, authPolicy: writer.policy });
  try {
    const url = `http://127.0.0.1:${registry.port}`;
    const proof = proofFixture("work_client_auth");
    const published = await publishProofToRegistry(url, proof, writer.issued.token);
    assert.equal(published.digest, proof.integrity.digest);
    const fetched = await getProofFromRegistry(url, proof.integrity.digest, writer.issued.token);
    assert.deepEqual(fetched, proof);
    const records = await listProofsFromRegistry(url, writer.issued.token);
    assert.equal(records.length, 1);
  } finally {
    await registry.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});
