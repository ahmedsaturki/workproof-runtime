const assert = require("assert");
const test = require("node:test");
const { authorize, createAuthPolicy, issueCredential, addIssuedCredential, namespaceVault, validateNamespace, validateAuthPolicy } = require("../packages/registry/src/auth.js");
const { startRegistryServer } = require("../packages/registry/src/http.js");
const { createTrustPolicy, trustKey } = require("../packages/evidence/src/trust.js");
const { generateProofKeyPair } = require("../packages/evidence/src/signature.js");
const { buildTrustPolicySnapshot, signTrustPolicySnapshot } = require("../packages/evidence/src/trust-sync.js");

test("registry auth rejects malformed bearer headers without accepting lookalike tokens", () => {
  const issued = issueCredential({ id: "sec-reader", permissions: ["read"] });
  const policy = createAuthPolicy();
  policy.credentials.push(issued.credential);

  const valid = authorize(policy, { authorization: `Bearer ${issued.token}` }, "read");
  assert.equal(valid.allowed, true);

  for (const authorization of [
    issued.token,
    `Basic ${issued.token}`,
    `Bearer ${issued.token} extra`,
    `bearer ${issued.token}`,
    `Bearer${issued.token}`
  ]) {
    const result = authorize(policy, { authorization }, "read");
    assert.equal(result.allowed, false);
    assert.equal(result.statusCode, 401);
  }
});

test("namespace validation and mapping reject traversal-shaped identifiers", () => {
  for (const value of ["../escape", "..", "/absolute", "A-UPPER", "space value", "a/b", "a\\b"]) {
    assert.throws(() => validateNamespace(value), /Invalid registry namespace/);
  }

  const root = "/tmp/workproof-security-root";
  const mapped = namespaceVault(root, "team-a");
  assert.equal(mapped, "/tmp/workproof-security-root/namespaces/team-a");
  assert.equal(mapped.startsWith(root + "/namespaces/"), true);
});

test("auth policy validation rejects malformed or duplicate credentials", () => {
  const issued = issueCredential({ id: "sec-reader", permissions: ["read"] });
  assert.doesNotThrow(() => validateAuthPolicy({ version: "0.1", credentials: [issued.credential] }));

  assert.throws(() => validateAuthPolicy({
    version: "0.1",
    credentials: [{ ...issued.credential, secretHash: "not-a-sha256" }]
  }), /Invalid registry credential/);

  assert.throws(() => validateAuthPolicy({
    version: "0.1",
    credentials: [issued.credential, { ...issued.credential }]
  }), /Invalid registry credential/);
});


test("trust permission is separate from ordinary proof write permission", () => {
  const issuedWrite = issueCredential({ id: "sec-write", permissions: ["write"] });
  const issuedTrust = issueCredential({ id: "sec-trust", permissions: ["trust"] });
  const policy = createAuthPolicy();
  policy.credentials.push(issuedWrite.credential, issuedTrust.credential);

  const writeDenied = authorize(policy, { authorization: `Bearer ${issuedWrite.token}` }, "trust");
  assert.equal(writeDenied.allowed, false);
  assert.equal(writeDenied.statusCode, 403);

  const trustAllowed = authorize(policy, { authorization: `Bearer ${issuedTrust.token}` }, "trust");
  assert.equal(trustAllowed.allowed, true);
});


test("trusted administrative signer identities are namespace-scoped when configured", async () => {
  const fs = require("fs");
  const os = require("os");
  const path = require("path");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "workproof-admin-scope-"));
  const adminA = generateProofKeyPair();
  const adminB = generateProofKeyPair();
  const trustA = createTrustPolicy();
  const recordA = trustKey(trustA, adminA.publicKey, "admin-a");
  const trustB = createTrustPolicy();
  const recordB = trustKey(trustB, adminB.publicKey, "admin-b");
  const auth = createAuthPolicy();
  const issuedACredential = issueCredential({ id: "trust-team-a", permissions: ["trust"], namespace: "team-a" });
  const issuedBCredential = issueCredential({ id: "trust-team-b", permissions: ["trust"], namespace: "team-b" });
  addIssuedCredential(auth, issuedACredential);
  addIssuedCredential(auth, issuedBCredential);
  const issuedA = issuedACredential;
  const issuedB = issuedBCredential;
  const server = await startRegistryServer({
    vaultDir: root,
    port: 0,
    authPolicy: auth,
    trustedAdminKeyIdsByNamespace: {
      "team-a": [recordA.keyId],
      "team-b": [recordB.keyId]
    }
  });

  try {
    const base = `http://127.0.0.1:${server.port}`;
    const snapshotA = signTrustPolicySnapshot(buildTrustPolicySnapshot(trustA, 1), adminA.privateKey);
    const accepted = await fetch(`${base}/v1/trust/snapshots`, {
      method: "POST",
      headers: { authorization: `Bearer ${issuedA.token}`, "content-type": "application/json" },
      body: JSON.stringify(snapshotA)
    });
    assert.equal(accepted.status, 200);

    const leaked = await fetch(`${base}/v1/trust/snapshots`, {
      method: "POST",
      headers: { authorization: `Bearer ${issuedB.token}`, "content-type": "application/json" },
      body: JSON.stringify(snapshotA)
    });
    assert.equal(leaked.status, 403);
    const leakedBody = await leaked.json();
    assert.match(String(leakedBody.error), /untrusted-signer/);
  } finally {
    await server.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

export {};
