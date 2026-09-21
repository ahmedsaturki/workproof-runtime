const assert = require("assert");
const test = require("node:test");
const { generateProofKeyPair, proofKeyId } = require("../packages/evidence/src/signature.js");
const { createTrustPolicy, trustKey, revokeKey } = require("../packages/evidence/src/trust.js");
const { buildTrustPolicySnapshot, signTrustPolicySnapshot, verifyTrustPolicySnapshot, reconcileTrustPolicySnapshot, applyTrustPolicySnapshot } = require("../packages/evidence/src/trust-sync.js");

function signedSnapshot(epoch = 1) {
  const pair = generateProofKeyPair();
  const trust = createTrustPolicy();
  const key = trustKey(trust, pair.publicKey, "registry-admin");
  const snapshot = signTrustPolicySnapshot(buildTrustPolicySnapshot(trust, epoch), pair.privateKey);
  return { pair, key, trust, snapshot };
}

test("signed trust snapshot verifies only for an explicitly trusted administrative key", () => {
  const { snapshot, key } = signedSnapshot();
  assert.equal(verifyTrustPolicySnapshot(snapshot, new Set([key.keyId])), "accept");
  assert.equal(verifyTrustPolicySnapshot(snapshot, new Set()), "untrusted-signer");
});

test("trust snapshot detects digest and signature tampering independently", () => {
  const { snapshot, key } = signedSnapshot();
  const mutatedPolicy = { ...snapshot.policy, keys: snapshot.policy.keys.slice(0, -1) };
  const digestTampered = { ...snapshot, policy: mutatedPolicy };
  assert.equal(verifyTrustPolicySnapshot(digestTampered, new Set([key.keyId])), "invalid");

  const signatureTampered = { ...snapshot, signature: { ...snapshot.signature, signature: snapshot.signature.signature.slice(0, -1) + (snapshot.signature.signature.slice(-1) === "A" ? "B" : "A") } };
  assert.equal(verifyTrustPolicySnapshot(signatureTampered, new Set([key.keyId])), "invalid");
});

test("snapshot reconciliation is monotonic by epoch and explicit on conflict or rollback", () => {
  const first = signedSnapshot(1);
  const current = first.snapshot;

  assert.equal(reconcileTrustPolicySnapshot(current, current, new Set([first.key.keyId])), "noop");

  const sameEpochConflict = signedSnapshot(1);
  sameEpochConflict.snapshot.policy.keys[0].label = "different";
  sameEpochConflict.snapshot = signTrustPolicySnapshot(buildTrustPolicySnapshot(sameEpochConflict.trust, 1), sameEpochConflict.pair.privateKey);
  assert.equal(reconcileTrustPolicySnapshot(current, sameEpochConflict.snapshot, new Set([first.key.keyId, sameEpochConflict.key.keyId])), "conflict");

  const newer = signedSnapshot(2);
  assert.equal(reconcileTrustPolicySnapshot(current, newer.snapshot, new Set([newer.key.keyId])), "accept");
  assert.equal(applyTrustPolicySnapshot(current, newer.snapshot, new Set([newer.key.keyId])).epoch, 2);

  assert.equal(reconcileTrustPolicySnapshot(newer.snapshot, current, new Set([first.key.keyId])), "rollback-required");
  assert.equal(applyTrustPolicySnapshot(newer.snapshot, current, new Set([first.key.keyId]), true).epoch, 1);
});

test("revoked or unrelated identity cannot become an accepted administrative signer through key ID alone", () => {
  const { snapshot, trust, key } = signedSnapshot();
  revokeKey(trust, key.keyId, "rotation");
  assert.equal(verifyTrustPolicySnapshot(snapshot, new Set()), "untrusted-signer");
  const unrelated = generateProofKeyPair();
  assert.notEqual(proofKeyId(unrelated.publicKey), key.keyId);
  assert.equal(verifyTrustPolicySnapshot(snapshot, new Set([proofKeyId(unrelated.publicKey)])), "untrusted-signer");
});

export {};
