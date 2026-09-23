const assert = require("assert");
const test = require("node:test");
const http = require("http");
const { WorkStore } = require("../packages/core/src/work.js");
const { CapabilityRegistry } = require("../packages/capabilities/src/registry.js");
const { VerificationEngine } = require("../packages/verification/src/engine.js");
const { WorkEngine } = require("../packages/runtime/src/engine.js");
const { JsonWorkRepository } = require("../packages/storage/src/json.js");

class AmbiguousHttpCreate {
  name = "http.order.create"; version = "0.1.0"; operations = ["create_order"]; riskClass = "external_write";
  postCalls = 0; store: { id: string; email: string }[] = [];
  baseUrl = "";
  async execute(request: any) {
    this.postCalls++;
    const body = JSON.stringify(request.input);
    return await new Promise<any>((resolve) => {
      const req = http.request(this.baseUrl + "/orders", { method: "POST", headers: { "content-type": "application/json", "content-length": body.length } }, (res: any) => {
        let data = "";
        res.on("data", (chunk: any) => data += chunk.toString());
        res.on("end", () => resolve({ status: res.statusCode === 201 ? "accepted" : "rejected", data: JSON.parse(data) }));
      });
      req.on("error", () => resolve({ status: "ambiguous" }));
      req.write(body);
      req.end();
    });
  }
}

class OrderExistsVerifier {
  name = "http.order.exists";
  constructor(private readonly baseUrl: string) {}
  async verify(ctx: any) {
    const id = String(ctx.work.contract.inputs?.orderId ?? "");
    const result = await fetch(this.baseUrl + "/orders/" + encodeURIComponent(id));
    const found = result.ok;
    return { id: ctx.criterion.id, criterion: ctx.criterion.description, passed: found, evidence: found ? [{ id: `http:${id}`, kind: "http", uri: `${this.baseUrl}/orders/${id}` }] : [] };
  }
}

test("real local HTTP ambiguous effect is reconciled without duplicate POST", async () => {
  const orders = new Map<string, any>();
  let postCalls = 0;
  const server = http.createServer((req: any, res: any) => {
    if (req.method === "POST" && req.url === "/orders") {
      postCalls++;
      let raw = "";
      req.on("data", (chunk: any) => raw += chunk.toString());
      req.on("end", () => {
        const input = JSON.parse(raw);
        const order = { id: input.orderId, email: input.email };
        orders.set(order.id, order);
        req.socket.destroy();
      });
      return;
    }
    if (req.method === "GET" && req.url?.startsWith("/orders/")) {
      const id = decodeURIComponent(req.url.slice("/orders/".length));
      const order = orders.get(id);
      if (!order) { res.writeHead(404); res.end(); return; }
      const body = JSON.stringify(order);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(body);
      return;
    }
    res.writeHead(404); res.end();
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    const store = new WorkStore();
    const registry = new CapabilityRegistry();
    const verification = new VerificationEngine();
    const cap = new AmbiguousHttpCreate();
    cap.baseUrl = baseUrl;
    registry.register(cap);
    verification.register(new OrderExistsVerifier(baseUrl));
    const work = store.create({
      objective: "Create exactly one order",
      inputs: { orderId: "ORD-1" },
      success: [{ id: "exists", description: "Order exists on server", verifier: "http.order.exists", required: true }],
      deliverables: [], riskClass: "external_write"
    });
    const engine = new WorkEngine(store, registry, verification, async (_work: any, effectId: string) => {
      const result = await fetch(baseUrl + "/orders/ORD-1");
      if (result.ok) {
        const effect = work.effects.find((e: any) => e.effectId === effectId);
        if (effect) effect.lastObservedState = await result.json();
        return true;
      }
      return false;
    }, undefined, new JsonWorkRepository(require("path").join(require("os").tmpdir(), "external-work-repo")));
    await engine.run(work, [{ id: "create", operation: "create_order", capability: cap.name, input: { orderId: "ORD-1", email: "a@example.com" }, idempotencyKey: "order:ORD-1", riskClass: "external_write", maxAttempts: 3 }]);
    assert.equal(work.status, "verified");
    assert.equal(postCalls, 1);
    assert.equal(work.effects[0].status, "verified");
    assert.ok(work.artifacts.some((a: any) => a.id === "http:ORD-1"));
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

export {};
