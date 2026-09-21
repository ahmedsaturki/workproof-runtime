const assert = require("assert");
const test = require("node:test");
const http = require("http");
const { WorkStore } = require("../packages/core/src/work.js");
const { CapabilityRegistry } = require("../packages/capabilities/src/registry.js");
const { VerificationEngine } = require("../packages/verification/src/engine.js");
const { WorkEngine } = require("../packages/runtime/src/engine.js");
const { registerPublicationPack } = require("../packages/packs/src/publication-pack.js");


test("controlled publication is verified from public state after an ambiguous acknowledgement", async () => {
  const posts = new Map<string, string>();
  let postCalls = 0;
  const server = http.createServer((req: any, res: any) => {
    if (req.method === "POST" && req.url === "/publish") {
      postCalls++;
      let raw = "";
      req.on("data", (c: any) => raw += c.toString());
      req.on("end", () => {
        const body = JSON.parse(raw);
        posts.set(body.id, body.content);
        req.socket.destroy();
      });
      return;
    }
    if (req.method === "GET" && req.url?.startsWith("/publications/")) {
      const id = decodeURIComponent(req.url.slice("/publications/".length));
      if (!posts.has(id)) { res.writeHead(404); res.end(); return; }
      const body = JSON.stringify({ id, content: posts.get(id) });
      res.writeHead(200, { "content-type": "application/json" }); res.end(body); return;
    }
    res.writeHead(404); res.end();
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const store = new WorkStore(); const registry = new CapabilityRegistry(); const verification = new VerificationEngine();
    registerPublicationPack(registry, verification);
    const work = store.create({
      objective: "Publish controlled content",
      inputs: { baseUrl, publicationId: "PUB-1", content: "hello verified world" },
      success: [{ id: "published", description: "Published content is publicly readable and exact", verifier: "pack.publication.local", required: true }],
      deliverables: [`${baseUrl}/publications/PUB-1`], riskClass: "external_write"
    });
    const engine = new WorkEngine(store, registry, verification, async (_w: any, _effectId: string) => posts.has("PUB-1"));
    await engine.run(work, [{ id: "publish", operation: "publish", capability: "pack.publication.local", input: { baseUrl, publicationId: "PUB-1", content: "hello verified world" }, idempotencyKey: "publish:PUB-1", riskClass: "external_write", maxAttempts: 3 }]);
    assert.equal(work.status, "verified");
    assert.equal(postCalls, 1);
    assert.ok(work.artifacts.some((a: any) => a.id === "publication:PUB-1"));
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

export {};
