const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const { generateProofKeyPair } = require("../packages/evidence/src/signature.js");
const { buildProofBundle } = require("../packages/evidence/src/bundle.js");
const { buildIntegrityManifest } = require("../packages/evidence/src/integrity.js");
const { exportPortableProof, verifyPortableProof, importPortableProof } = require("../packages/evidence/src/portable.js");
const { signProof } = require("../packages/evidence/src/signature.js");

function runCli(...args: string[]) {
  const cli = path.resolve("dist/packages/cli/src/index.js");
  return spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });
}

function createProof(dir: string): { proofPath: string; artifactPath: string; keyPair: any } {
  fs.mkdirSync(dir, { recursive: true });
  const artifactPath = path.join(dir, "source-artifact.txt");
  fs.writeFileSync(artifactPath, "portable-proof-artifact-v1\n", "utf8");

  const keyPair = generateProofKeyPair();
  const work = {
    id: "work_portable_v1",
    contract: {
      objective: "portable proof",
      success: [{
        id: "artifact",
        description: "Portable artifact exists",
        verifier: "test.portable",
        required: true
      }],
      deliverables: [artifactPath],
      riskClass: "read"
    },
    status: "verified",
    effects: [],
    artifacts: [{
      id: "artifact-ref",
      kind: "file",
      uri: "file://" + artifactPath,
      metadata: {}
    }],
    verification: {
      status: "verified",
      checks: [{
        id: "artifact",
        criterion: "Portable artifact exists",
        passed: true,
        evidence: [{
          id: "artifact-ref",
          kind: "file",
          uri: "file://" + artifactPath
        }]
      }],
      verifiedAt: "2026-09-22T00:00:00.000Z"
    },
    events: [],
    createdAt: "2026-09-22T00:00:00.000Z",
    updatedAt: "2026-09-22T00:00:00.000Z"
  };

  const proofPath = path.join(dir, "proof.json");
  const proof = buildProofBundle(work);
  const integrity = buildIntegrityManifest(work);
  const unsigned = { ...proof, integrity };
  const signature = signProof(unsigned, keyPair.privateKey);
  fs.writeFileSync(proofPath, JSON.stringify({ ...unsigned, signature }, null, 2) + "\n", "utf8");
  return { proofPath, artifactPath, keyPair };
}

test("portable proof export/import preserves integrity, signature, and sidecar artifacts", () => {
  const root = fs.mkdtempSync("/tmp/workproof-portable-v1-");
  const sourceDir = path.join(root, "source");
  const bundleDir = path.join(root, "bundle");
  const importedDir = path.join(root, "imported");

  try {
    const created = createProof(sourceDir);

    const exported = exportPortableProof(created.proofPath, bundleDir);
    assert.equal(exported.version, "0.1");
    assert.equal(exported.kind, "workproof.portable-proof");
    assert.equal(exported.workId, "work_portable_v1");
    assert.equal(exported.artifacts.length, 1);
    assert.equal(exported.artifacts[0].portable, true);

    const verified = verifyPortableProof(bundleDir);
    assert.equal(verified.proofDigest, exported.proofDigest);

    const imported = importPortableProof(bundleDir, importedDir);
    assert.equal(imported.manifest.proofDigest, exported.proofDigest);
    assert.ok(fs.existsSync(imported.proofPath));
    assert.equal(imported.artifactPaths.length, 1);
    assert.ok(fs.existsSync(imported.artifactPaths[0]));

    const originalProof = fs.readFileSync(created.proofPath, "utf8");
    const importedProof = fs.readFileSync(imported.proofPath, "utf8");
    assert.equal(importedProof, originalProof);

    const importedJson = JSON.parse(importedProof);
    assert.equal(importedJson.integrity.digest, exported.proofDigest);
    assert.ok(importedJson.signature);

    fs.rmSync(sourceDir, { recursive: true, force: true });
    assert.doesNotThrow(() => verifyPortableProof(bundleDir));
    assert.equal(fs.existsSync(path.join(bundleDir, "artifacts", exported.artifacts[0].sha256)), true);

    const tamperedArtifact = path.join(bundleDir, "artifacts", exported.artifacts[0].sha256);
    fs.writeFileSync(tamperedArtifact, "tampered\n", "utf8");
    assert.throws(() => verifyPortableProof(bundleDir), /Portable artifact digest mismatch/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("CLI portable proof workflow exports, verifies, and imports a proof bundle", () => {
  const root = fs.mkdtempSync("/tmp/workproof-portable-cli-");
  try {
    const created = createProof(path.join(root, "source"));
    const bundleDir = path.join(root, "bundle");
    const importedDir = path.join(root, "imported");

    const exportResult = runCli("proof-export", created.proofPath, bundleDir);
    assert.equal(exportResult.status, 0, exportResult.stderr || exportResult.stdout);
    assert.match(exportResult.stdout, /"status": "exported"/);

    const verifyResult = runCli("proof-bundle-verify", bundleDir);
    assert.equal(verifyResult.status, 0, verifyResult.stderr || verifyResult.stdout);
    assert.match(verifyResult.stdout, /"status": "verified"/);

    const importResult = runCli("proof-import", bundleDir, importedDir);
    assert.equal(importResult.status, 0, importResult.stderr || importResult.stdout);
    assert.match(importResult.stdout, /"status": "imported"/);

    const importedProof = path.join(importedDir, "proof.json");
    assert.equal(JSON.parse(fs.readFileSync(importedProof, "utf8")).integrity.digest,
      JSON.parse(fs.readFileSync(created.proofPath, "utf8")).integrity.digest);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("portable proof verification rejects bundle path traversal", () => {
  const root = fs.mkdtempSync("/tmp/workproof-portable-traversal-");
  try {
    const manifest = {
      version: "0.1",
      kind: "workproof.portable-proof",
      workId: "w",
      proofDigest: "0".repeat(64),
      proofFile: { path: "../proof.json", sha256: "0".repeat(64), size: 1 },
      artifacts: [],
      exportedAt: "2026-09-22T00:00:00.000Z"
    };
    fs.writeFileSync(path.join(root, "manifest.json"), JSON.stringify(manifest), "utf8");
    assert.throws(() => verifyPortableProof(root), /Invalid proof path|Portable proof manifest/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("portable verifier rejects manifest omissions and sidecar symlinks", () => {
  const root = fs.mkdtempSync("/tmp/workproof-portable-manifest-");
  try {
    const created = createProof(path.join(root, "source"));
    const bundleDir = path.join(root, "bundle");
    const manifest = exportPortableProof(created.proofPath, bundleDir);

    const originalManifest = JSON.parse(fs.readFileSync(path.join(bundleDir, "manifest.json"), "utf8"));
    originalManifest.artifacts = [];
    fs.writeFileSync(path.join(bundleDir, "manifest.json"), JSON.stringify(originalManifest, null, 2), "utf8");
    assert.throws(() => verifyPortableProof(bundleDir), /artifact manifest does not match/);

    fs.writeFileSync(path.join(bundleDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
    const artifact = manifest.artifacts[0];
    const sidecar = path.join(bundleDir, artifact.path as string);
    const outside = path.join(root, "outside.txt");
    fs.writeFileSync(outside, "outside
", "utf8");
    fs.unlinkSync(sidecar);
    fs.symlinkSync(outside, sidecar);
    assert.throws(() => verifyPortableProof(bundleDir), /must be a regular file/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

export {};
