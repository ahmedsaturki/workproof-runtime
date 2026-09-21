const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const path = require("path");

const { createTrustPolicy, saveTrustPolicy, loadTrustPolicy, trustKey, revokeKey, evaluateProofTrust } = require("../packages/evidence/src/trust.js");
const { generateProofKeyPair, proofKeyId, signProof, verifyProofSignature } = require("../packages/evidence/src/signature.js");

test("trust policy persists trusted and revoked identities", () => {
  const dir = "/tmp/workproof-trust";
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const policyPath = path.join(dir, "trust.json");

  const pair = generateProofKeyPair();
  const policy = createTrustPolicy();
  const added = trustKey(policy, pair.publicKey, "primary");
  assert.equal(added.keyId, proofKeyId(pair.publicKey));
  assert.equal(added.state, "trusted");
  saveTrustPolicy(policyPath, policy);

  const loaded = loadTrustPolicy(policyPath);
  assert.equal(evaluateProofTrust(loaded, added), "trusted");

  revokeKey(loaded, added.keyId, "rotation");
  saveTrustPolicy(policyPath, loaded);
  const revoked = loadTrustPolicy(policyPath);
  assert.equal(evaluateProofTrust(revoked, added), "revoked");
});

test("trust policy distinguishes unknown identities and mismatched key material", () => {
  const first = generateProofKeyPair();
  const second = generateProofKeyPair();
  const policy = createTrustPolicy();
  const trusted = trustKey(policy, first.publicKey);
  assert.equal(evaluateProofTrust(policy, { keyId: trusted.keyId, publicKey: second.publicKey }), "unknown");
  assert.equal(evaluateProofTrust(policy, { keyId: proofKeyId(second.publicKey), publicKey: second.publicKey }), "unknown");
  assert.equal(evaluateProofTrust(policy), "not-present");
});

test("trust enrollment rejects non-Ed25519 public keys", () => {
  const policy = createTrustPolicy();
  assert.throws(
    () => trustKey(policy, "-----BEGIN PUBLIC KEY-----\nnot-a-key\n-----END PUBLIC KEY-----\n"),
    /Invalid trusted|Failed to read|DECODER|key/
  );
});

test("valid signature does not imply trusted identity", () => {
  const pair = generateProofKeyPair();
  const proof = { version: "0.1", work: { id: "trust-proof" }, effects: [], artifacts: [], verification: null, events: [] };
  const signature = signProof(proof, pair.privateKey);
  const signed = { ...proof, signature };
  assert.equal(verifyProofSignature(signed, signature), true);

  const emptyPolicy = createTrustPolicy();
  assert.equal(evaluateProofTrust(emptyPolicy, signature), "unknown");

  trustKey(emptyPolicy, pair.publicKey, "known");
  assert.equal(evaluateProofTrust(emptyPolicy, signature), "trusted");
});

export {};
