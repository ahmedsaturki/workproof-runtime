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
      /invalid-request/i
    );
  } finally {
    await registry.close();
    fs.rmSync(vaultDir, { recursive: true, force: true });
  }
});

export {};

test("registry proof publishing sends only the validated proof transport shape", async () => {
  let resolveReceived: ((value: Record<string, any>) => void) | null = null;
  const receivedPromise = new Promise<Record<string, any>>((resolve) => {
    resolveReceived = resolve;
  });

  const server = require("http").createServer((req: any, res: any) => {
    const chunks: any[] = [];
    req.on("data", (chunk: any) => chunks.push(chunk));
    req.on("end", () => {
      const received = JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, any>;
      resolveReceived?.(received);
      resolveReceived = null;
      const body = JSON.stringify({ digest: fixture().integrity.digest });
      res.writeHead(200, { "content-type": "application/json" });
      res.end(body);
    });
  });

  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const proof = fixture();
    proof.untrustedTopLevelField = "must-not-transmit";
    const published = await publishProofToRegistry(`http://127.0.0.1:${server.address().port}`, proof);
    const received = await receivedPromise;
    assert.equal(published.digest, proof.integrity.digest);
    assert.equal(received.untrustedTopLevelField, undefined);
    assert.equal(received.integrity.digest, proof.integrity.digest);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error: any) => error ? reject(error) : resolve()));
  }
});
