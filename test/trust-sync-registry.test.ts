const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const { createAuthPolicy, issueCredential, addIssuedCredential } = require("../packages/registry/src/auth.js");
const { startRegistryServer } = require("../packages/registry/src/http.js");
const { publishTrustSnapshotToRegistry, getTrustSnapshotFromRegistry, listTrustSnapshotsFromRegistry, getCurrentTrustSnapshotFromRegistry, applyTrustSnapshotToRegistry } = require("../packages/registry/src/client.js");
const { createTrustPolicy, trustKey } = require("../packages/evidence/src/trust.js");
const { generateProofKeyPair } = require("../packages/evidence/src/signature.js");
const { buildTrustPolicySnapshot, signTrustPolicySnapshot } = require("../packages/evidence/src/trust-sync.js");

function tempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function addCredential(policy: any, id: string, permissions: ("read" | "write" | "trust")[], namespace = "sync-a") {
  const issued = issueCredential({ id, permissions, namespace });
  addIssuedCredential(policy, issued);
  return issued;
}

test("two authenticated registries publish, pull, apply, conflict, reject forged signer, and propagate revocation", async () => {
  const rootA = tempDir("workproof-sync-a-");
  const rootB = tempDir("workproof-sync-b-");
  const admin = generateProofKeyPair();
  const adminTrust = createTrustPolicy();
  const adminRecord = trustKey(adminTrust, admin.publicKey, "sync-admin");

  const authA = createAuthPolicy();
  const credA = addCredential(authA, "trust-a", ["trust"]);
  const authB = createAuthPolicy();
  const credB = addCredential(authB, "trust-b", ["trust"]);
  const writeOnly = addCredential(authB, "write-only", ["write"]);

  const registryA = await startRegistryServer({ vaultDir: rootA, port: 0, authPolicy: authA, trustedAdminKeyIdsByNamespace: { "sync-a": [adminRecord.keyId] } });
  const registryB = await startRegistryServer({ vaultDir: rootB, port: 0, authPolicy: authB, trustedAdminKeyIdsByNamespace: { "sync-a": [adminRecord.keyId] } });

  try {
    const urlA = `http://127.0.0.1:${registryA.port}`;
    const urlB = `http://127.0.0.1:${registryB.port}`;
    const target = generateProofKeyPair();
    const policy1 = createTrustPolicy();
    trustKey(policy1, target.publicKey, "revocation-target");
    const snapshot1 = signTrustPolicySnapshot(buildTrustPolicySnapshot(policy1, 1), admin.privateKey);

    await assert.rejects(() => publishTrustSnapshotToRegistry(urlB, snapshot1, writeOnly.token), /forbidden/);

    await publishTrustSnapshotToRegistry(urlA, snapshot1, credA.token);
    const pulled1 = await getTrustSnapshotFromRegistry(urlA, snapshot1.digest, credA.token);
    assert.equal(pulled1.digest, snapshot1.digest);

    await publishTrustSnapshotToRegistry(urlB, pulled1, credB.token);
    const applied1 = await applyTrustSnapshotToRegistry(urlB, snapshot1.digest, credB.token);
    assert.equal(applied1.status, "accept");
    assert.equal(applied1.current.epoch, 1);

    const policy2 = JSON.parse(JSON.stringify(policy1));
    policy2.keys[0].state = "revoked";
    policy2.keys[0].reason = "propagated revocation";
    const snapshot2 = signTrustPolicySnapshot(buildTrustPolicySnapshot(policy2, 2), admin.privateKey);
    await publishTrustSnapshotToRegistry(urlA, snapshot2, credA.token);
    const pulled2 = await getTrustSnapshotFromRegistry(urlA, snapshot2.digest, credA.token);
    await publishTrustSnapshotToRegistry(urlB, pulled2, credB.token);
    const applied2 = await applyTrustSnapshotToRegistry(urlB, snapshot2.digest, credB.token);
    assert.equal(applied2.status, "accept");
    assert.equal(applied2.current.epoch, 2);
    assert.equal(applied2.current.policy.keys[0].state, "revoked");

    const currentB = await getCurrentTrustSnapshotFromRegistry(urlB, credB.token);
    assert.equal(currentB.epoch, 2);
    const listedB = await listTrustSnapshotsFromRegistry(urlB, credB.token);
    assert.equal(listedB.length, 2);
    assert.equal(listedB[0].path, `${listedB[0].digest}.json`);
    assert.equal(path.isAbsolute(String(listedB[0].path)), false);

    const conflictPolicy = JSON.parse(JSON.stringify(policy2));
    conflictPolicy.keys[0].reason = "same-epoch conflict";
    const conflict = signTrustPolicySnapshot(buildTrustPolicySnapshot(conflictPolicy, 2), admin.privateKey);
    await publishTrustSnapshotToRegistry(urlB, conflict, credB.token);
    await assert.rejects(() => applyTrustSnapshotToRegistry(urlB, conflict.digest, credB.token), /conflict/);

    const forged = generateProofKeyPair();
    const forgedSnapshot = signTrustPolicySnapshot(buildTrustPolicySnapshot(createTrustPolicy(), 3), forged.privateKey);
    await assert.rejects(() => publishTrustSnapshotToRegistry(urlA, forgedSnapshot, credA.token), /untrusted-signer/);

    const malformed = { ...snapshot2, signature: { ...snapshot2.signature, signature: "A" + snapshot2.signature.signature.slice(1) } };
    await assert.rejects(() => publishTrustSnapshotToRegistry(urlA, malformed, credA.token), /invalid/);

    const rolledBack = await applyTrustSnapshotToRegistry(urlB, snapshot1.digest, credB.token, true);
    assert.equal(rolledBack.status, "accept");
    assert.equal(rolledBack.current.epoch, 1);
  } finally {
    await registryA.close();
    await registryB.close();
    fs.rmSync(rootA, { recursive: true, force: true });
    fs.rmSync(rootB, { recursive: true, force: true });
  }
});


test("registry client rejects a transport-level trust snapshot with invalid cryptographic signature", async () => {
  const pair = generateProofKeyPair();
  const policy = createTrustPolicy();
  const snapshot = signTrustPolicySnapshot(buildTrustPolicySnapshot(policy, 1), pair.privateKey);
  const forged = {
    ...snapshot,
    signature: {
      ...snapshot.signature,
      signature: snapshot.signature.signature.slice(0, -1) + (snapshot.signature.signature.endsWith("A") ? "B" : "A")
    }
  };
  const server = http.createServer((_req: any, res: any) => {
    const body = JSON.stringify({ version: "1.2", snapshot: forged });
    res.writeHead(200, { "content-type": "application/json", "content-length": Buffer.byteLength(body) });
    res.end(body);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  try {
    await assert.rejects(
      () => getTrustSnapshotFromRegistry(`http://127.0.0.1:${port}`, snapshot.digest),
      /Trust snapshot signature is invalid/
    );
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error: any) => error ? reject(error) : resolve()));
  }
});

export {};
