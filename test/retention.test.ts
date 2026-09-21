const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const path = require("path");
const { buildProofBundle } = require("../packages/evidence/src/bundle.js");
const { buildIntegrityManifest } = require("../packages/evidence/src/integrity.js");
const { publishProof, loadVaultIndex, saveVaultIndex, sha256File } = require("../packages/evidence/src/vault.js");
const { setRetentionClass, pinRetention, unpinRetention, inventoryVault, planGarbageCollection, executeGarbageCollection, repairVaultIndex } = require("../packages/evidence/src/retention.js");

function writeProof(baseDir: string, id: string, body = "artifact\n") {
  fs.mkdirSync(baseDir, { recursive: true });
  const artifact = path.join(baseDir, id + "-artifact.txt");
  fs.writeFileSync(artifact, body, "utf8");
  const work = {
    id,
    contract: { objective: id, success: [], deliverables: [], riskClass: "read" },
    status: "verified",
    effects: [],
    artifacts: [{ id: "a1", kind: "file", uri: artifact }],
    verification: { status: "verified", checks: [], verifiedAt: "2026-09-21T00:00:00.000Z" },
    events: [],
    createdAt: "2026-09-21T00:00:00.000Z",
    updatedAt: "2026-09-21T00:00:00.000Z"
  };
  const proof = buildProofBundle(work);
  const integrity = buildIntegrityManifest(work);
  const proofPath = path.join(baseDir, id + ".json");
  fs.writeFileSync(proofPath, JSON.stringify({ ...proof, integrity }, null, 2), "utf8");
  return { proofPath, artifact, digest: integrity.digest };
}

test("retention plan keeps pinned and retained proofs and protects reachable artifacts", () => {
  const dir = "/tmp/workproof-retention-keep";
  fs.rmSync(dir, { recursive: true, force: true });
  const p = writeProof(dir, "keep");
  const vault = path.join(dir, "vault");
  const record = publishProof(p.proofPath, vault);
  setRetentionClass(vault, record.digest, "proof", "long", "alpha");
  const inventory = inventoryVault(vault);
  assert.ok(inventory.some((x: any) => x.kind === "proof" && x.protected));
  const plan = planGarbageCollection(vault, { namespace: "alpha" });
  assert.equal(plan.candidates.length, 0);
});

test("dry-run reports an expired proof and orphan artifact without deleting data", () => {
  const dir = "/tmp/workproof-retention-dry";
  fs.rmSync(dir, { recursive: true, force: true });
  const p = writeProof(dir, "expire");
  const vault = path.join(dir, "vault");
  const record = publishProof(p.proofPath, vault);
  const index = loadVaultIndex(vault);
  index.records[0].publishedAt = "2025-01-01T00:00:00.000Z";
  saveVaultIndex(vault, index);
  const plan = planGarbageCollection(vault);
  assert.ok(plan.candidates.some((x: any) => x.kind === "proof" && x.digest === record.digest && x.reason === "expired"));
  assert.ok(plan.candidates.some((x: any) => x.kind === "artifact" && x.reason === "orphan"));
  assert.equal(fs.existsSync(record.proofPath), true);
});

test("pin and unpin change reachability deterministically", () => {
  const dir = "/tmp/workproof-retention-pin";
  fs.rmSync(dir, { recursive: true, force: true });
  const p = writeProof(dir, "pin");
  const vault = path.join(dir, "vault");
  const record = publishProof(p.proofPath, vault);
  const index = loadVaultIndex(vault);
  index.records[0].publishedAt = "2025-01-01T00:00:00.000Z";
  saveVaultIndex(vault, index);
  pinRetention(vault, record.digest, "proof", "legal hold", "alpha");
  assert.equal(planGarbageCollection(vault, { namespace: "alpha" }).candidates.length, 0);
  assert.equal(unpinRetention(vault, record.digest, "proof"), true);
  assert.ok(planGarbageCollection(vault, { namespace: "alpha" }).candidates.length >= 1);
});

test("shared artifacts remain reachable while one proof is retained", () => {
  const dir = "/tmp/workproof-retention-shared";
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const common = path.join(dir, "common.txt");
  fs.writeFileSync(common, "shared\n", "utf8");
  function proof(id: string) {
    const work = { id, contract: { objective: id, success: [], deliverables: [], riskClass: "read" }, status: "verified", effects: [], artifacts: [{ id: "shared", kind: "file", uri: common }], verification: { status: "verified", checks: [], verifiedAt: "2026-09-21T00:00:00.000Z" }, events: [], createdAt: "2026-09-21T00:00:00.000Z", updatedAt: "2026-09-21T00:00:00.000Z" };
    const bundle = buildProofBundle(work);
    const integrity = buildIntegrityManifest(work);
    const file = path.join(dir, id + ".json");
    fs.writeFileSync(file, JSON.stringify({ ...bundle, integrity }, null, 2), "utf8");
    return file;
  }
  const vault = path.join(dir, "vault");
  const first = publishProof(proof("first"), vault);
  const second = publishProof(proof("second"), vault);
  const index = loadVaultIndex(vault);
  index.records.find((x: any) => x.digest === first.digest).publishedAt = "2025-01-01T00:00:00.000Z";
  saveVaultIndex(vault, index);
  setRetentionClass(vault, second.digest, "proof", "long");
  const artifactDigest = sha256File(common);
  const plan = planGarbageCollection(vault);
  assert.equal(plan.candidates.some((x: any) => x.kind === "artifact" && x.digest === artifactDigest), false);
});

test("corrupt proofs and artifacts are never auto-deleted", () => {
  const dir = "/tmp/workproof-retention-corrupt";
  fs.rmSync(dir, { recursive: true, force: true });
  const p = writeProof(dir, "corrupt");
  const vault = path.join(dir, "vault");
  const record = publishProof(p.proofPath, vault);
  const index = loadVaultIndex(vault);
  index.records[0].publishedAt = "2025-01-01T00:00:00.000Z";
  saveVaultIndex(vault, index);
  fs.writeFileSync(record.proofPath, "tampered\n", "utf8");
  const plan = planGarbageCollection(vault);
  assert.equal(plan.candidates.some((x: any) => x.kind === "proof" && x.digest === record.digest), false);
  assert.ok(plan.warnings.some((x: any) => x.includes(record.digest)));
});

test("execute garbage collection uses an index-first journal and removes expired content", () => {
  const dir = "/tmp/workproof-retention-execute";
  fs.rmSync(dir, { recursive: true, force: true });
  const p = writeProof(dir, "delete");
  const vault = path.join(dir, "vault");
  const record = publishProof(p.proofPath, vault);
  const index = loadVaultIndex(vault);
  index.records[0].publishedAt = "2025-01-01T00:00:00.000Z";
  saveVaultIndex(vault, index);
  const result = executeGarbageCollection(vault);
  assert.equal(result.executed, true);
  assert.ok(result.deleted >= 1);
  assert.equal(fs.existsSync(record.proofPath), false);
  assert.equal(loadVaultIndex(vault).records.length, 0);
  assert.ok(fs.existsSync(result.journalPath));
  assert.match(fs.readFileSync(path.join(vault, "gc-events.jsonl"), "utf8"), /gc.deleted/);
});

test("repair removes stale index references and recovers a stale GC journal", () => {
  const dir = "/tmp/workproof-retention-repair";
  fs.rmSync(dir, { recursive: true, force: true });
  const p = writeProof(dir, "repair");
  const vault = path.join(dir, "vault");
  const record = publishProof(p.proofPath, vault);
  fs.unlinkSync(record.proofPath);
  fs.writeFileSync(path.join(vault, "gc-journal.json"), JSON.stringify({ version: "0.1", phase: "partial" }), "utf8");
  const result = repairVaultIndex(vault);
  assert.equal(result.removedRecords, 1);
  assert.equal(result.journalRecovered, true);
  assert.equal(fs.existsSync(path.join(vault, "gc-journal.json")), false);
});

test("retention inventory does not follow symlinks outside the vault", () => {
  const dir = "/tmp/workproof-retention-symlink";
  fs.rmSync(dir, { recursive: true, force: true });
  const vault = path.join(dir, "vault");
  const outside = path.join(dir, "outside.txt");
  fs.mkdirSync(path.join(vault, "artifacts"), { recursive: true });
  fs.writeFileSync(outside, "outside\n", "utf8");
  const fakeDigest = sha256File(outside);
  fs.symlinkSync(outside, path.join(vault, "artifacts", fakeDigest));
  const inventory = inventoryVault(vault);
  assert.equal(inventory.some((x: any) => x.digest === fakeDigest), false);
});

test("namespace scoped collection is conservative and does not delete unscoped objects", () => {
  const dir = "/tmp/workproof-retention-namespace";
  fs.rmSync(dir, { recursive: true, force: true });
  const p = writeProof(dir, "namespace");
  const vault = path.join(dir, "vault");
  const record = publishProof(p.proofPath, vault);
  const index = loadVaultIndex(vault);
  index.records[0].publishedAt = "2025-01-01T00:00:00.000Z";
  saveVaultIndex(vault, index);
  setRetentionClass(vault, record.digest, "proof", "ephemeral");
  const plan = planGarbageCollection(vault, { namespace: "alpha" });
  assert.equal(plan.candidates.some((x: any) => x.digest === record.digest), false);
});

export {};
