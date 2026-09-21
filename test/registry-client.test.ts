const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { startRegistryServer } = require("../packages/registry/src/http.js");
const { publishProofToRegistry, getProofFromRegistry, listProofsFromRegistry } = require("../packages/registry/src/client.js");
const { buildProofBundle } = require("../packages/evidence/src/bundle.js");
const { buildIntegrityManifest } = require("../packages/evidence/src/integrity.js");

function fixture() {
  const work = {
    id: "work_registry_client",
    contract: { objective: "registry client", success: [], deliverables: [], riskClass: "read" },
    status: "verified",
    effects: [],
    artifacts: [],
    verification: { status: "verified", checks: [], verifiedAt: "2026-09-21T00:00:00.000Z" },
    events: [],
    createdAt: "2026-09-21T00:00:00.000Z",
    updatedAt: "2026-09-21T00:00:00.000Z"
  };
  const proof = buildProofBundle(work);
  return { ...proof, integrity: buildIntegrityManifest(work) };
}

function tempVault() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "workproof-registry-client-"));
}

test("registry client publishes, retrieves, and lists proof with independent digest verification", async () => {
  const vaultDir = tempVault();
  const registry = await startRegistryServer({ vaultDir, port: 0 });
  try {
    const proof = fixture();
    const url = `http://127.0.0.1:${registry.port}`;
    const published = await publishProofToRegistry(url, proof);
    assert.equal(published.digest, proof.integrity.digest);

    const fetched = await getProofFromRegistry(url, proof.integrity.digest);
    assert.deepEqual(fetched, proof);

    const records = await listProofsFromRegistry(url);
    assert.equal(records.length, 1);
    assert.equal(records[0].digest, proof.integrity.digest);
  } finally {
    await registry.close();
    fs.rmSync(vaultDir, { recursive: true, force: true });
  }
});

test("registry client refuses invalid proofs and malformed digests before transport", async () => {
  const invalid = fixture();
  invalid.work.status = "failed";

  await assert.rejects(
    publishProofToRegistry("http://127.0.0.1:9", invalid),
    /integrity must verify/i
  );

  await assert.rejects(
    getProofFromRegistry("http://127.0.0.1:9", "not-a-digest"),
    /SHA-256/i
  );
});

test("registry client rejects corrupted proof returned by the registry", async () => {
  const vaultDir = tempVault();
  const registry = await startRegistryServer({ vaultDir, port: 0 });
  try {
    const proof = fixture();
    const url = `http://127.0.0.1:${registry.port}`;
    const published = await publishProofToRegistry(url, proof);
    const retainedPath = path.join(vaultDir, "proofs", `${published.digest}.json`);
    fs.writeFileSync(retainedPath, JSON.stringify({ ...proof, work: { ...proof.work, status: "failed" } }), "utf8");

    await assert.rejects(
      getProofFromRegistry(url, published.digest),
      /integrity|digest/i
    );
  } finally {
    await registry.close();
    fs.rmSync(vaultDir, { recursive: true, force: true });
  }
});

export {};
