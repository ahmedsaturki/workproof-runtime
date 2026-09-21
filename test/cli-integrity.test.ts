const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const { buildProofBundle } = require("../packages/evidence/src/bundle.js");
const { buildIntegrityManifest } = require("../packages/evidence/src/integrity.js");

test("CLI verify accepts an intact proof and rejects a tampered proof bundle", () => {
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
  const dir = "/tmp/workproof-cli-integrity";
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const proofPath = path.join(dir, "proof.json");
  fs.writeFileSync(proofPath, JSON.stringify({ ...proof, integrity }, null, 2), "utf8");

  const cli = path.resolve("dist/packages/cli/src/index.js");
  const valid = spawnSync(process.execPath, [cli, "verify", proofPath], { encoding: "utf8" });
  assert.equal(valid.status, 0);
  assert.match(valid.stdout, /integrity=verified/);
  assert.match(valid.stdout, /status=verified/);

  const tampered = { ...proof, work: { ...proof.work, status: "failed" }, integrity };
  fs.writeFileSync(proofPath, JSON.stringify(tampered, null, 2), "utf8");
  const invalid = spawnSync(process.execPath, [cli, "verify", proofPath], { encoding: "utf8" });
  assert.equal(invalid.status, 3);
  assert.match(invalid.stdout, /invalid-integrity/);
});

export {};