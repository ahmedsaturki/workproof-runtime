const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const { generateProofKeyPair } = require("../packages/evidence/src/signature.js");
const { buildProofBundle } = require("../packages/evidence/src/bundle.js");
const { buildIntegrityManifest } = require("../packages/evidence/src/integrity.js");

function runCli(...args: string[]) {
  const cli = path.resolve("dist/packages/cli/src/index.js");
  return spawnSync(require("process").execPath, [cli, ...args], { encoding: "utf8" });
}

function createSignedProof(dir: string, privatePath: string): string {
  const pair = generateProofKeyPair();
  fs.writeFileSync(privatePath, pair.privateKey, "utf8");
  const work = {
    id: "work_trust_cli",
    contract: { objective: "trust cli", success: [], deliverables: [], riskClass: "read" },
    status: "verified",
    effects: [],
    artifacts: [],
    verification: { status: "verified", checks: [], verifiedAt: "2026-09-21T00:00:00.000Z" },
    events: [],
    createdAt: "2026-09-21T00:00:00.000Z",
    updatedAt: "2026-09-21T00:00:00.000Z"
  };
  const proofPath = path.join(dir, "proof.json");
  fs.writeFileSync(proofPath, JSON.stringify({ ...buildProofBundle(work), integrity: buildIntegrityManifest(work) }, null, 2), "utf8");
  assert.equal(runCli("sign", proofPath, privatePath).status, 0);
  fs.writeFileSync(path.join(dir, "public.pem"), require("../packages/evidence/src/signature.js").signProof(JSON.parse(fs.readFileSync(proofPath, "utf8")), fs.readFileSync(privatePath, "utf8")).publicKey ?? "", "utf8");
  return proofPath;
}

test("CLI trust-add and require-trusted accept a trusted signed proof", () => {
  const dir = require("path").join(require("os").tmpdir(), "workproof-trust-cli");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const privatePath = path.join(dir, "private.pem");
  const publicPath = path.join(dir, "public.pem");
  const trustPath = path.join(dir, "trust.json");

  const pair = generateProofKeyPair();
  fs.writeFileSync(privatePath, pair.privateKey, "utf8");
  fs.writeFileSync(publicPath, pair.publicKey, "utf8");

  const work = {
    id: "work_trust_cli",
    contract: { objective: "trust cli", success: [], deliverables: [], riskClass: "read" },
    status: "verified",
    effects: [],
    artifacts: [],
    verification: { status: "verified", checks: [], verifiedAt: "2026-09-21T00:00:00.000Z" },
    events: [],
    createdAt: "2026-09-21T00:00:00.000Z",
    updatedAt: "2026-09-21T00:00:00.000Z"
  };
  const proofPath = path.join(dir, "proof.json");
  fs.writeFileSync(proofPath, JSON.stringify({ ...buildProofBundle(work), integrity: buildIntegrityManifest(work) }, null, 2), "utf8");
  assert.equal(runCli("sign", proofPath, privatePath).status, 0);

  const add = runCli("trust-add", publicPath, trustPath, "primary");
  assert.equal(add.status, 0);
  assert.match(add.stdout, /"state": "trusted"/);

  const verified = runCli("verify", proofPath, trustPath, "--require-trusted");
  assert.equal(verified.status, 0);
  assert.match(verified.stdout, /signature=verified/);
  assert.match(verified.stdout, /trust=trusted/);
});

test("CLI require-trusted rejects a cryptographically valid unknown or revoked identity", () => {
  const dir = require("path").join(require("os").tmpdir(), "workproof-trust-cli-reject");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const privatePath = path.join(dir, "private.pem");
  const publicPath = path.join(dir, "public.pem");
  const trustPath = path.join(dir, "trust.json");
  const pair = generateProofKeyPair();
  fs.writeFileSync(privatePath, pair.privateKey, "utf8");
  fs.writeFileSync(publicPath, pair.publicKey, "utf8");

  const work = {
    id: "work_trust_cli_reject",
    contract: { objective: "trust cli reject", success: [], deliverables: [], riskClass: "read" },
    status: "verified",
    effects: [],
    artifacts: [],
    verification: { status: "verified", checks: [], verifiedAt: "2026-09-21T00:00:00.000Z" },
    events: [],
    createdAt: "2026-09-21T00:00:00.000Z",
    updatedAt: "2026-09-21T00:00:00.000Z"
  };
  const proofPath = path.join(dir, "proof.json");
  fs.writeFileSync(proofPath, JSON.stringify({ ...buildProofBundle(work), integrity: buildIntegrityManifest(work) }, null, 2), "utf8");
  assert.equal(runCli("sign", proofPath, privatePath).status, 0);

  const unknown = runCli("verify", proofPath, trustPath, "--require-trusted");
  assert.equal(unknown.status, 5);
  assert.match(unknown.stdout, /trust=unknown/);

  assert.equal(runCli("trust-add", publicPath, trustPath).status, 0);
  const revoke = runCli("trust-revoke", require("../packages/evidence/src/signature.js").proofKeyId(pair.publicKey), trustPath, "rotated");
  assert.equal(revoke.status, 0);

  const revoked = runCli("verify", proofPath, trustPath, "--require-trusted");
  assert.equal(revoked.status, 5);
  assert.match(revoked.stdout, /trust=revoked/);
});

export {};
