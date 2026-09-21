const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const nodeExecutable = require("process").execPath;

const { buildProofBundle } = require("../packages/evidence/src/bundle.js");
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
  const dir = "/tmp/workproof-cli-integrity";
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
  assert.match(invalid.stdout, /invalid-integrity/);
});

test("CLI verify rejects altered integrity metadata even when the bundle digest is unchanged", () => {
  const { proof, integrity } = fixture();
  const dir = "/tmp/workproof-cli-integrity-metadata";
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const proofPath = path.join(dir, "proof.json");
  const tamperedMetadata = { ...integrity, workId: "forged-work-id" };
  fs.writeFileSync(proofPath, JSON.stringify({ ...proof, integrity: tamperedMetadata }, null, 2), "utf8");

  const cli = path.resolve("dist/packages/cli/src/index.js");
  const result = spawnSync(nodeExecutable, [cli, "verify", proofPath], { encoding: "utf8" });
  assert.equal(result.status, 3);
  assert.match(result.stdout, /invalid-integrity/);
});

test("CLI verify keeps legacy proofs readable without an integrity manifest", () => {
  const { proof } = fixture();
  const dir = "/tmp/workproof-cli-legacy";
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

export {};
