const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const { buildProofBundle } = require("../packages/evidence/src/bundle.js");
const { buildIntegrityManifest } = require("../packages/evidence/src/integrity.js");

function runCli(...args: string[]) {
  const cli = path.resolve("dist/packages/cli/src/index.js");
  return spawnSync(require("process").execPath, [cli, ...args], { encoding: "utf8" });
}

test("CLI publishes, lists, inspects, and restores a proof through the local vault", () => {
  const dir = "/tmp/workproof-vault-cli";
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const proofPath = path.join(dir, "proof.json");
  const vaultDir = path.join(dir, "vault");
  const restoredPath = path.join(dir, "restored", "proof.json");
  const work = {
    id: "work_vault_cli",
    contract: { objective: "vault cli", success: [], deliverables: [], riskClass: "read" },
    status: "verified",
    effects: [],
    artifacts: [],
    verification: { status: "verified", checks: [], verifiedAt: "2026-09-21T00:00:00.000Z" },
    events: [],
    createdAt: "2026-09-21T00:00:00.000Z",
    updatedAt: "2026-09-21T00:00:00.000Z"
  };
  const proof = buildProofBundle(work);
  const integrity = buildIntegrityManifest(work);
  fs.writeFileSync(proofPath, JSON.stringify({ ...proof, integrity }, null, 2), "utf8");

  const publish = runCli("vault-publish", proofPath, vaultDir);
  assert.equal(publish.status, 0);
  const published = JSON.parse(publish.stdout);
  assert.equal(published.status, "published");

  const list = runCli("vault-list", vaultDir);
  assert.equal(list.status, 0);
  const records = JSON.parse(list.stdout);
  assert.equal(records.length, 1);
  assert.equal(records[0].digest, published.digest);

  const inspect = runCli("vault-inspect", published.digest, vaultDir);
  assert.equal(inspect.status, 0);
  assert.equal(JSON.parse(inspect.stdout).workId, work.id);

  const restore = runCli("vault-restore", published.digest, vaultDir, restoredPath);
  assert.equal(restore.status, 0);
  assert.equal(JSON.parse(fs.readFileSync(restoredPath, "utf8")).integrity.digest, published.digest);
});

export {};
