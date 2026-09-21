const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const { buildProofBundle } = require("../packages/evidence/src/bundle.js");
const { buildIntegrityManifest } = require("../packages/evidence/src/integrity.js");

function fixture() {
  const work = {
    id: "work_cli_signature",
    contract: {
      objective: "cli signature",
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
  return { ...proof, integrity };
}

function runCli(...args) {
  const cli = path.resolve("dist/packages/cli/src/index.js");
  return spawnSync(require("process").execPath, [cli, ...args], { encoding: "utf8" });
}

test("CLI keygen, sign, and verify establish self-contained proof identity", () => {
  const dir = "/tmp/workproof-cli-signature";
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const privatePath = path.join(dir, "proof-private.pem");
  const publicPath = path.join(dir, "proof-public.pem");
  const proofPath = path.join(dir, "proof.json");
  fs.writeFileSync(proofPath, JSON.stringify(fixture(), null, 2), "utf8");

  const keygen = runCli("keygen", privatePath, publicPath);
  assert.equal(keygen.status, 0);
  assert.ok(fs.existsSync(privatePath));
  assert.ok(fs.existsSync(publicPath));
  assert.equal(fs.statSync(privatePath).mode & 0o777, 0o600);

  const overwrite = runCli("keygen", privatePath, publicPath);
  assert.equal(overwrite.status, 1);
  assert.match(overwrite.stderr, /Refusing to overwrite an existing key file/);

  const signing = runCli("sign", proofPath, privatePath);
  assert.equal(signing.status, 0);
  assert.match(signing.stdout, /"status": "signed"/);

  const verified = runCli("verify", proofPath);
  assert.equal(verified.status, 0);
  assert.match(verified.stdout, /integrity=verified/);
  assert.match(verified.stdout, /signature=verified/);
  assert.match(verified.stdout, /status=verified/);
});

test("CLI verify separates signature tampering from proof-integrity tampering", () => {
  const dir = "/tmp/workproof-cli-signature-tamper";
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const privatePath = path.join(dir, "private.pem");
  const publicPath = path.join(dir, "public.pem");
  const proofPath = path.join(dir, "proof.json");
  fs.writeFileSync(proofPath, JSON.stringify(fixture(), null, 2), "utf8");
  assert.equal(runCli("keygen", privatePath, publicPath).status, 0);
  assert.equal(runCli("sign", proofPath, privatePath).status, 0);

  const signed = JSON.parse(fs.readFileSync(proofPath, "utf8"));
  signed.signature = { ...signed.signature, signature: signed.signature.signature.slice(0, -2) + "AA" };
  fs.writeFileSync(proofPath, JSON.stringify(signed, null, 2), "utf8");
  const signatureTampered = runCli("verify", proofPath);
  assert.equal(signatureTampered.status, 4);
  assert.match(signatureTampered.stdout, /integrity=verified/);
  assert.match(signatureTampered.stdout, /signature=invalid/);

  signed.signature = fixture().signature;
  delete signed.signature;
  signed.work.status = "failed";
  const integrityTampered = { ...signed };
  fs.writeFileSync(proofPath, JSON.stringify(integrityTampered, null, 2), "utf8");
  const proofTampered = runCli("verify", proofPath);
  assert.equal(proofTampered.status, 3);
  assert.match(proofTampered.stdout, /integrity=not-present/);
  assert.match(proofTampered.stdout, /status=failed/);
});

export {};
