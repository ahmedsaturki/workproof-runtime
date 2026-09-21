const assert = require("assert");
const test = require("node:test");
const http = require("http");

const { WorkStore } = require("../packages/core/src/work.js");
const { CapabilityRegistry } = require("../packages/capabilities/src/registry.js");
const { VerificationEngine } = require("../packages/verification/src/engine.js");
const { WorkEngine } = require("../packages/runtime/src/engine.js");
const { registerGitHubPack, findGitHubIssueByMarker } = require("../packages/packs/src/github-pack.js");

type ServerState = {
  server: any;
  baseUrl: string;
  githubPosts: number;
  orderPosts: number;
  issues: any[];
  orders: any[];
};

function startTwoSystemServer(): Promise<ServerState> {
  const issues: any[] = [];
  const orders: any[] = [];
  let githubPosts = 0;
  let orderPosts = 0;
  let nextIssue = 1;
  const server = http.createServer((req: any, res: any) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");

    if (req.method === "GET" && url.pathname === "/repos/acme/demo/issues") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(issues));
      return;
    }

    if (req.method === "POST" && url.pathname === "/repos/acme/demo/issues") {
      githubPosts++;
      let raw = "";
      req.on("data", (chunk: any) => raw += chunk.toString());
      req.on("end", () => {
        const input = JSON.parse(raw);
        const issueNumber = nextIssue++;
        issues.push({
          number: issueNumber,
          title: input.title,
          body: input.body,
          html_url: `http://127.0.0.1/issues/${issueNumber}`,
          repository_url: "http://127.0.0.1/repos/acme/demo",
          state: "open"
        });
        req.socket.destroy();
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/orders") {
      orderPosts++;
      let raw = "";
      req.on("data", (chunk: any) => raw += chunk.toString());
      req.on("end", () => {
        const input = JSON.parse(raw);
        orders.push({ id: input.orderId, email: input.email });
        req.socket.destroy();
      });
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/orders/")) {
      const id = decodeURIComponent(url.pathname.slice("/orders/".length));
      const order = orders.find(value => value.id === id);
      if (!order) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(order));
      return;
    }

    res.writeHead(404);
    res.end();
  });

  return new Promise(resolve => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address() as any;
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${address.port}`,
        get githubPosts() { return githubPosts; },
        get orderPosts() { return orderPosts; },
        issues,
        orders
      });
    });
  });
}

class AmbiguousOrderCreate {
  name = "http.order.create";
  version = "0.1.0";
  operations = ["create_order"];
  riskClass = "external_write" as const;
  constructor(private readonly baseUrl: string) {}

  async execute(request: any) {
    const body = JSON.stringify(request.input);
    return await new Promise<any>(resolve => {
      const req = http.request(this.baseUrl + "/orders", {
        method: "POST",
        headers: { "content-type": "application/json", "content-length": Buffer.byteLength(body) }
      }, (res: any) => {
        res.resume();
        res.on("end", () => resolve({ status: "accepted" }));
      });
      req.on("error", () => resolve({ status: "ambiguous", data: { reason: "lost-ack" } }));
      req.write(body);
      req.end();
    });
  }
}

class OrderVerifier {
  name = "http.order.exists";
  constructor(private readonly baseUrl: string) {}

  async verify(ctx: any) {
    const orderId = String(ctx.work.contract.constraints?.orderId ?? "");
    const response = await fetch(this.baseUrl + "/orders/" + encodeURIComponent(orderId));
    if (!response.ok) {
      return { id: ctx.criterion.id, criterion: ctx.criterion.description, passed: false, evidence: [] };
    }
    const order = await response.json() as { id: string; email: string };
    const passed = order.id === orderId && order.email === "two-system@example.com";
    return {
      id: ctx.criterion.id,
      criterion: ctx.criterion.description,
      passed,
      evidence: passed ? [{ id: `http:order:${order.id}`, kind: "http-public-state", uri: this.baseUrl + "/orders/" + encodeURIComponent(order.id) }] : []
    };
  }
}

test("two independent external systems reconcile lost acknowledgements without duplicate writes", async () => {
  const fake = await startTwoSystemServer();
  try {
    const store = new WorkStore();
    const registry = new CapabilityRegistry();
    const verification = new VerificationEngine();
    registerGitHubPack(registry, verification);
    registry.register(new AmbiguousOrderCreate(fake.baseUrl));
    verification.register(new OrderVerifier(fake.baseUrl));

    const githubInput = {
      repository: "acme/demo",
      title: "Two-system WorkProof acceptance",
      body: "Controlled two-system fault injection.",
      idempotencyMarker: "two-system-001",
      apiBaseUrl: fake.baseUrl
    };
    const work = store.create({
      objective: "Perform and independently verify one GitHub write and one order write",
      inputs: githubInput,
      constraints: { orderId: "ORD-2SYS" },
      success: [
        { id: "github", description: "GitHub issue exists with the expected marker and content", verifier: "pack.github.issue.create", required: true },
        { id: "order", description: "Order exists in the second system with the expected email", verifier: "http.order.exists", required: true }
      ],
      deliverables: ["GitHub issue", "order"],
      riskClass: "external_write"
    });

    const engine = new WorkEngine(
      store,
      registry,
      verification,
      async (_work: any, effectId: string) => {
        const effect = work.effects.find((e: any) => e.effectId === effectId);
        if (!effect) return false;
        if (effect.operation === "create_issue") {
          return Boolean(await findGitHubIssueByMarker(githubInput));
        }
        if (effect.operation === "create_order") {
          const response = await fetch(fake.baseUrl + "/orders/ORD-2SYS");
          if (!response.ok) return false;
          effect.lastObservedState = await response.json();
          return true;
        }
        return false;
      }
    );

    await engine.run(work, [
      {
        id: "github",
        operation: "create_issue",
        capability: "pack.github.issue.create",
        input: githubInput,
        idempotencyKey: "github:issue:two-system-001",
        riskClass: "external_write"
      },
      {
        id: "order",
        operation: "create_order",
        capability: "http.order.create",
        input: { orderId: "ORD-2SYS", email: "two-system@example.com" },
        idempotencyKey: "order:ORD-2SYS",
        riskClass: "external_write"
      }
    ]);

    assert.equal(work.status, "verified");
    assert.equal(fake.githubPosts, 1);
    assert.equal(fake.orderPosts, 1);
    assert.equal(work.effects.length, 2);
    assert.equal(work.effects[0].status, "verified");
    assert.equal(work.effects[1].status, "verified");
    assert.equal(work.effects[0].operation, "create_issue");
    assert.equal(work.effects[1].operation, "create_order");
    assert.ok(work.artifacts.some((a: any) => a.kind === "github-issue-state"));
    assert.ok(work.artifacts.some((a: any) => a.kind === "http-public-state"));
  } finally {
    await new Promise<void>(resolve => fake.server.close(() => resolve()));
  }
});

export {};