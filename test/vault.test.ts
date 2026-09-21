const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const path = require("path");

const { buildProofBundle } = require("../packages/evidence/src/bundle.js");
const { buildIntegrityManifest } = require("../packages/evidence/src/integrity.js");
const { generateProofKeyPair, signProof } = require("../packages/evidence/src/signature.js");
const { publishProof, listProofs, restoreProof, sha256File } = require("../packages/evidence/src/vault.js");

function writeFixture(dir, withArtifact = true) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const artifactPath = path.join(dir, "artifact.txt");
  fs.writeFileSync(artifactPath, "durable artifact\n", "utf8");
  const work = {
    id: "work_vault",
    contract: { objective: "vault retention", success: [], deliverables: [], riskClass: "read" },
    status: "verified",
    effects: [],
    artifacts: withArtifact ? [{ id: "artifact-1", kind: "file", uri: artifactPath }] : [],
    verification: { status: "verified", checks: [], verifiedAt: "2026-09-21T00:00:00.000Z" },
    events: [],
    createdAt: "2026-09-21T00:00:00.000Z",
    updatedAt: "2026-09-21T00:00:00.000Z"
  };
  const proof = buildProofBundle(work);
  const pair = generateProofKeyPair();
  const signature = signProof({ ...proof, integrity: buildIntegrityManifest(work) }, pair.privateKey);
  const signed = { ...proof, integrity: buildIntegrityManifest(work), signature };
  const proofPath = path.join(dir, "proof.json");
  fs.writeFileSync(proofPath, JSON.stringify(signed, null, 2), "utf8");
  return { proofPath, artifactPath, pair };
}

test("vault publication is content-addressed and idempotent", () => {
  const dir = "/tmp/workproof-vault";
  const { proofPath, artifactPath } = writeFixture(dir);
  const vault = path.join(dir, "vault");

  const first = publishProof(proofPath, vault);
  const second = publishProof(proofPath, vault);
  assert.equal(first.digest, second.digest);
  assert.equal(listProofs(vault).length, 1);
  assert.ok(fs.existsSync(first.proofPath));
  const artifactDigest = sha256File(artifactPath);
  assert.equal(first.artifacts[artifactPath], path.join(vault, "artifacts", artifactDigest));
  assert.ok(fs.existsSync(first.artifacts[artifactPath]));
});

test("vault restore verifies proof and retained artifact integrity", () => {
  const dir = "/tmp/workproof-vault-restore";
  const { proofPath } = writeFixture(dir, false);
  const vault = path.join(dir, "vault");
  const record = publishProof(proofPath, vault);
  const output = path.join(dir, "restored", "proof.json");
  restoreProof(vault, record.digest, output);
  assert.equal(JSON.parse(fs.readFileSync(output, "utf8")).integrity.digest, record.digest);

  fs.writeFileSync(record.proofPath, JSON.stringify({
    ...JSON.parse(fs.readFileSync(record.proofPath, "utf8")),
    work: { ...JSON.parse(fs.readFileSync(record.proofPath, "utf8")).work, status: "failed" }
  }, null, 2), "utf8");
  assert.throws(() => restoreProof(vault, record.digest, path.join(dir, "bad.json")), /integrity verification/);
});


test("vault rejects a corrupted retained artifact during publish and restore", () => {
  const dir = "/tmp/workproof-vault-artifact-corruption";
  const { proofPath, artifactPath } = writeFixture(dir);
  const vault = path.join(dir, "vault");
  const record = publishProof(proofPath, vault);
  fs.writeFileSync(record.artifacts[artifactPath], "tampered\n", "utf8");

  assert.throws(
    () => publishProof(proofPath, vault),
    /Existing vault artifact failed integrity verification/
  );

  assert.throws(
    () => restoreProof(vault, record.digest, path.join(dir, "restored.json")),
    /Vault artifact failed integrity verification/
  );
});

test("vault rejects malformed or duplicated index records", () => {
  const dir = "/tmp/workproof-vault-index";
  const { proofPath } = writeFixture(dir, false);
  const vault = path.join(dir, "vault");
  const record = publishProof(proofPath, vault);
  const indexPath = path.join(vault, "index.json");
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  index.records.push({ ...record });
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), "utf8");
  assert.throws(() => listProofs(vault), /Duplicate proof vault digest/);
});


test("vault rejects index artifact references that are absent from the proof", () => {
  const dir = "/tmp/workproof-vault-reference";
  const { proofPath } = writeFixture(dir, true);
  const vault = path.join(dir, "vault");
  const record = publishProof(proofPath, vault);
  const indexPath = path.join(vault, "index.json");
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  index.records[0].artifacts["file:///unrelated.txt"] = Object.values(record.artifacts)[0];
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), "utf8");
  assert.throws(() => restoreProof(vault, record.digest, path.join(dir, "restored.json")), /absent from proof/);
});


test("vault rejects proof and artifact paths that escape the vault", () => {
  const dir = "/tmp/workproof-vault-paths";
  const { proofPath } = writeFixture(dir, true);
  const vault = path.join(dir, "vault");
  const record = publishProof(proofPath, vault);
  const indexPath = path.join(vault, "index.json");
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));

  index.records[0].proofPath = path.join(dir, "artifact.txt");
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), "utf8");
  assert.throws(() => listProofs(vault), /Invalid proof vault record/);

  const clean = publishProof(proofPath, path.join(dir, "vault-clean"));
  const cleanIndexPath = path.join(dir, "vault-clean", "index.json");
  const cleanIndex = JSON.parse(fs.readFileSync(cleanIndexPath, "utf8"));
  cleanIndex.records[0].artifacts["/outside"] = clean.artifacts[Object.keys(clean.artifacts)[0]];
  fs.writeFileSync(cleanIndexPath, JSON.stringify(cleanIndex, null, 2), "utf8");
  assert.throws(() => listProofs(path.join(dir, "vault-clean")), /Invalid proof vault artifact reference/);
});


export {};
