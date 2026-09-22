const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const nodeExecutable = require("process").execPath;

const { buildProofBundle } = require("../packages/evidence/src/bundle.js");
const { digestProofBundle } = require("../packages/evidence/src/integrity.js");
const { buildIntegrityManifest } = require("../packages/evidence/src/integrity.js");

function fixture() {
  const work = {
    id: "work_cli_integrity",
    contract: {
      objective: "cli integrity",
      success: [],
      deliverables: [],
      riskClass: "read"
    },
    status: "verified",
    effects: [],
    artifacts: [],
    verification: {
      status: "verified",
      checks: [],
      verifiedAt: "2026-09-21T00:00:00.000Z"
    },
    events: [],
    createdAt: "2026-09-21T00:00:00.000Z",
    updatedAt: "2026-09-21T00:00:00.000Z"
  };
  const proof = buildProofBundle(work);
  const integrity = buildIntegrityManifest(work);
  return { proof, integrity };
}

test("CLI verify accepts an intact proof and rejects a tampered proof bundle", () => {
  const { proof, integrity } = fixture();
  const dir = require("path").join(require("os").tmpdir(), "workproof-cli-integrity");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const proofPath = path.join(dir, "proof.json");
  fs.writeFileSync(proofPath, JSON.stringify({ ...proof, integrity }, null, 2), "utf8");

  const cli = path.resolve("dist/packages/cli/src/index.js");
  const valid = spawnSync(nodeExecutable, [cli, "verify", proofPath], { encoding: "utf8" });
  assert.equal(valid.status, 0);
  assert.match(valid.stdout, /integrity=verified/);
  assert.match(valid.stdout, /status=verified/);

  const tampered = { ...proof, work: { ...proof.work, status: "failed" }, integrity };
  fs.writeFileSync(proofPath, JSON.stringify(tampered, null, 2), "utf8");
  const invalid = spawnSync(nodeExecutable, [cli, "verify", proofPath], { encoding: "utf8" });
  assert.equal(invalid.status, 3);
  assert.match(invalid.stdout, /integrity=invalid/);
});

test("CLI verify rejects altered integrity metadata even when the bundle digest is unchanged", () => {
  const { proof, integrity } = fixture();
  const dir = require("path").join(require("os").tmpdir(), "workproof-cli-integrity-metadata");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const proofPath = path.join(dir, "proof.json");
  const tamperedMetadata = { ...integrity, workId: "forged-work-id" };
  fs.writeFileSync(proofPath, JSON.stringify({ ...proof, integrity: tamperedMetadata }, null, 2), "utf8");

  const cli = path.resolve("dist/packages/cli/src/index.js");
  const result = spawnSync(nodeExecutable, [cli, "verify", proofPath], { encoding: "utf8" });
  assert.equal(result.status, 3);
  assert.match(result.stdout, /integrity=invalid/);
});

test("CLI verify keeps legacy proofs readable without an integrity manifest", () => {
  const { proof } = fixture();
  const dir = require("path").join(require("os").tmpdir(), "workproof-cli-legacy");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const proofPath = path.join(dir, "legacy.json");
  fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2), "utf8");

  const cli = path.resolve("dist/packages/cli/src/index.js");
  const result = spawnSync(nodeExecutable, [cli, "verify", proofPath], { encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /integrity=not-present/);
  assert.match(result.stdout, /status=verified/);
});

test("CLI compatibility accepts supported and legacy proof formats, but rejects unsupported versions", () => {
  const { proof, integrity } = fixture();
  const dir = require("path").join(require("os").tmpdir(), "workproof-cli-compatibility");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });

  const cli = path.resolve("dist/packages/cli/src/index.js");
  const supportedPath = path.join(dir, "supported.json");
  fs.writeFileSync(supportedPath, JSON.stringify({ ...proof, integrity }, null, 2), "utf8");
  const supported = spawnSync(nodeExecutable, [cli, "compatibility", supportedPath], { encoding: "utf8" });
  assert.equal(supported.status, 0);
  assert.match(supported.stdout, /"status": "compatible"/);

  const legacyPath = path.join(dir, "legacy.json");
  fs.writeFileSync(legacyPath, JSON.stringify(proof, null, 2), "utf8");
  const legacy = spawnSync(nodeExecutable, [cli, "compatibility", legacyPath], { encoding: "utf8" });
  assert.equal(legacy.status, 0);
  assert.match(legacy.stdout, /"status": "compatible"/);
  assert.match(legacy.stdout, /legacy 0\.1 proof/);

  const unsupported = {
    ...proof,
    version: "0.2",
    integrity: { ...integrity, digest: digestProofBundle({ ...proof, version: "0.2", artifacts: proof.artifacts, effects: proof.effects, sagas: proof.sagas ?? [], verification: proof.verification, events: proof.events }) }
  };
  const unsupportedPath = path.join(dir, "unsupported.json");
  fs.writeFileSync(unsupportedPath, JSON.stringify(unsupported, null, 2), "utf8");
  const result = spawnSync(nodeExecutable, [cli, "verify", unsupportedPath], { encoding: "utf8" });
  assert.equal(result.status, 6);
  assert.match(result.stdout, /compatibility=unsupported/);

  fs.rmSync(dir, { recursive: true, force: true });
});

export {};
