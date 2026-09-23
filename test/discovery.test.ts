const assert = require("assert");
const test = require("node:test");
const http = require("http");
const fs = require("fs");
const { WorkStore } = require("../packages/core/src/work.js");
const { CapabilityRegistry } = require("../packages/capabilities/src/registry.js");
const { VerificationEngine } = require("../packages/verification/src/engine.js");
const { WorkEngine } = require("../packages/runtime/src/engine.js");
const { registerWebDiscoveryPack } = require("../packages/packs/src/web-discovery-pack.js");

test("web discovery searches over HTTP, deduplicates, materializes an artifact, and verifies it", async () => {
  const rows = [
    { name: "Alpha", website: "https://alpha.example", source: "catalog" },
    { name: "Alpha duplicate", website: "https://ALPHA.example", source: "catalog" },
    { name: "Beta", website: "https://beta.example", source: "catalog" },
    { name: "Gamma", website: "https://gamma.example", source: "catalog" }
  ];
  const server = http.createServer((req: any, res: any) => {
    if (req.url?.startsWith("/search")) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ results: rows }));
      return;
    }
    res.writeHead(404); res.end();
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}/search`;
  const output = require("path").join(require("os").tmpdir(), "web-discovery.json"); try { fs.unlinkSync(output); } catch {}
  try {
    const store = new WorkStore(); const registry = new CapabilityRegistry(); const verification = new VerificationEngine();
    registerWebDiscoveryPack(registry, verification);
    const work = store.create({
      objective: "Discover and verify suppliers",
      inputs: { searchUrl: base, query: "suppliers", minRecords: 3, outputPath: output },
      success: [{ id: "artifact", description: "Three unique sourced records exist", verifier: "pack.discovery.http", required: true }],
      deliverables: [output], riskClass: "read"
    });
    const engine = new WorkEngine(store, registry, verification, async () => false);
    await engine.run(work, [{ id: "discover", operation: "discover_records", capability: "pack.discovery.http", input: { searchUrl: base, query: "suppliers", minRecords: 3, outputPath: output }, idempotencyKey: "discover:suppliers", riskClass: "read" }]);
    assert.equal(work.status, "verified");
    assert.equal(JSON.parse(fs.readFileSync(output, "utf8")).length, 3);
    assert.ok(work.artifacts.some((a: any) => a.id.startsWith("artifact:")));
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

export {};

test("web discovery rejects malformed network records before artifact materialization", async () => {
  const server = http.createServer((_req: any, res: any) => {
    const body = JSON.stringify({
      results: [
        { name: " Alpha ", website: "https://alpha.example", source: " catalog " },
        { name: "", website: "https://ignored.example", source: "catalog" },
        { name: "Bad Scheme", website: "file:///etc/passwd", source: "catalog" },
        { name: "Bad Type", website: 123, source: "catalog" },
        { name: "Beta", website: "https://beta.example", source: "catalog", injected: "<script>alert(1)</script>" }
      ]
    });
    res.writeHead(200, { "content-type": "application/json", "content-length": Buffer.byteLength(body) });
    res.end(body);
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const root = fs.mkdtempSync(require("path").join(require("os").tmpdir(), "workproof-discovery-validation-"));
  const output = require("path").join(root, "records.json");
  try {
    const store = new WorkStore(); const registry = new CapabilityRegistry(); const verification = new VerificationEngine();
    registerWebDiscoveryPack(registry, verification);
    const work = store.create({
      objective: "Validate discovered records",
      inputs: { searchUrl: `http://127.0.0.1:${(server.address() as any).port}/search`, query: "suppliers", minRecords: 2, outputPath: output },
      success: [{ id: "artifact", description: "Two valid records exist", verifier: "pack.discovery.http", required: true }],
      deliverables: [output], riskClass: "read"
    });
    const engine = new WorkEngine(store, registry, verification, async () => false);
    await engine.run(work, [{ id: "discover", operation: "discover_records", capability: "pack.discovery.http", input: { searchUrl: work.contract.inputs.searchUrl, query: "suppliers", minRecords: 2, outputPath: output }, idempotencyKey: "discover:validation", riskClass: "read" }]);
    const rows = JSON.parse(fs.readFileSync(output, "utf8"));
    assert.equal(work.status, "verified");
    assert.deepEqual(rows, [
      { name: "Alpha", website: "https://alpha.example", source: "catalog" },
      { name: "Beta", website: "https://beta.example", source: "catalog" }
    ]);
    assert.equal(JSON.stringify(rows).includes("injected"), false);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    fs.rmSync(root, { recursive: true, force: true });
  }
});

