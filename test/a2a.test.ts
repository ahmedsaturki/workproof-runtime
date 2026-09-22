const assert = require("assert");
const test = require("node:test");
const http = require("http");
import { startA2AServer } from "../apps/a2a-server";

function fakeWork(id: string, objective: string, status: string = "verified") {
  return {
    id,
    contract: { objective, riskClass: "read", success: [], deliverables: [], approvalRequired: false },
    status,
    events: [],
    effects: [],
    artifacts: [],
    updatedAt: "2026-09-22T00:00:00.000Z"
  };
}

test("A2A adapter exposes agent card, authentication, version negotiation, SendMessage, and idempotent forwarding", async () => {
  const token = "a2a-local-test-token-123456";
  let dispatchCount = 0;
  const idempotencyKeys: string[] = [];
  const created = fakeWork("a2a_created", "hello");

  const controlServer = http.createServer((req: any, res: any) => {
    const url = new URL(String(req.url ?? "/"), "http://127.0.0.1");
    if (req.headers.authorization !== "Bearer " + token) {
      res.writeHead(401, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "unauthorized" }));
      return;
    }
    if (req.method === "GET" && url.pathname === "/v1/work/a2a_created") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ work: created }));
      return;
    }
    if (req.method === "POST" && url.pathname === "/v1/work/dispatch") {
      dispatchCount += 1;
      idempotencyKeys.push(String(req.headers["idempotency-key"] ?? ""));
      const chunks: any[] = [];
      req.on("data", (chunk: any) => chunks.push(chunk));
      req.on("end", () => {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ work: created }));
      });
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not-found" }));
  });
  await new Promise<void>(resolve => controlServer.listen(0, "127.0.0.1", () => resolve()));
  const controlPort = controlServer.address().port;

  const a2a = await startA2AServer({
    host: "127.0.0.1",
    port: 0,
    controlPlaneUrl: "http://127.0.0.1:" + controlPort,
    token,
    publicUrl: "http://127.0.0.1:0"
  });

  try {
    const base = "http://127.0.0.1:" + a2a.port;
    const card = await fetch(base + "/.well-known/agent-card.json");
    assert.equal(card.status, 200);
    const cardBody = await card.json();
    assert.equal(cardBody.capabilities.streaming, false);
    assert.ok(card.headers.get("etag"));

    const unauth = await fetch(base + "/rpc", {
      method: "POST",
      headers: { "content-type": "application/json", "A2A-Version": "1.0" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "SendMessage", params: { message: { messageId: "m1", role: "ROLE_USER", parts: [{ text: "hello" }] } } })
    });
    assert.equal(unauth.status, 401);

    const badVersion = await fetch(base + "/rpc", {
      method: "POST",
      headers: { "content-type": "application/json", "authorization": "Bearer " + token, "A2A-Version": "0.9" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "SendMessage", params: { message: { messageId: "m1", role: "ROLE_USER", parts: [{ text: "hello" }] } } })
    });
    assert.equal(badVersion.status, 400);

    const sent = await fetch(base + "/rpc", {
      method: "POST",
      headers: { "content-type": "application/json", "authorization": "Bearer " + token, "A2A-Version": "1.0" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 3, method: "SendMessage", params: { message: { messageId: "m1", role: "ROLE_USER", parts: [{ text: "hello" }] } } })
    });
    assert.equal(sent.status, 200);
    assert.equal((await sent.json()).result.task.id, "a2a_created");
    assert.equal(dispatchCount, 1);

    const replay = await fetch(base + "/rpc", {
      method: "POST",
      headers: { "content-type": "application/json", "authorization": "Bearer " + token, "A2A-Version": "1.0" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 4, method: "SendMessage", params: { message: { messageId: "m1", role: "ROLE_USER", parts: [{ text: "hello" }] } } })
    });
    assert.equal(replay.status, 200);
    assert.equal((await replay.json()).result.task.id, "a2a_created");
    assert.equal(dispatchCount, 2);
    assert.equal(idempotencyKeys[0], idempotencyKeys[1]);
    assert.match(idempotencyKeys[0], /^a2a\.message\.[0-9a-f]{64}$/);
  } finally {
    await a2a.close();
    await new Promise<void>(resolve => controlServer.close(() => resolve()));
  }
});

export {};

test("A2A ListTasks projects Work Object summaries into tasks", async () => {
  const token = "a2a-list-test-token-123456";
  const works = [
    { id: "work_one", status: "verified", contract: { objective: "one", riskClass: "read", metadata: { a2aContextId: "ctx-one" } }, createdAt: "2026-09-22T00:00:00.000Z", updatedAt: "2026-09-22T00:00:03.000Z" },
    { id: "work_two", status: "failed", contract: { objective: "two", riskClass: "read", metadata: { a2aContextId: "ctx-two" } }, createdAt: "2026-09-22T00:00:00.000Z", updatedAt: "2026-09-22T00:00:02.000Z" }
  ];
  const controlServer = http.createServer((req: any, res: any) => {
    const url = new URL(String(req.url ?? "/"), "http://127.0.0.1");
    if (req.headers.authorization !== "Bearer " + token) {
      res.writeHead(401, { "content-type": "application/json" });
      res.end("{}");
      return;
    }
    if (req.method === "GET" && url.pathname === "/v1/work") {
      const status = url.searchParams.get("status");
      const filtered = status ? works.filter(w => w.status === status) : works;
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({
        work: filtered.map(w => ({
          id: w.id,
          status: w.status,
          objective: w.contract.objective,
          riskClass: w.contract.riskClass,
          approvalRequired: false,
          createdAt: w.createdAt,
          updatedAt: w.updatedAt,
          a2aContextId: w.contract.metadata.a2aContextId
        })),
        total: filtered.length
      }));
      return;
    }
    res.writeHead(404);
    res.end("{}");
  });
  await new Promise<void>(resolve => controlServer.listen(0, "127.0.0.1", () => resolve()));
  const controlPort = controlServer.address().port;
  const a2a = await startA2AServer({
    host: "127.0.0.1",
    port: 0,
    controlPlaneUrl: "http://127.0.0.1:" + controlPort,
    token
  });
  try {
    const response = await fetch("http://127.0.0.1:" + a2a.port + "/rpc", {
      method: "POST",
      headers: {
        "content-type": "application/a2a+json",
        "authorization": "Bearer " + token,
        "a2a-version": "1.0"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 9,
        method: "ListTasks",
        params: { pageSize: 1, status: "TASK_STATE_COMPLETED" }
      })
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type").startsWith("application/json"), true);
    const body = await response.json();
    assert.equal(body.result.tasks.length, 1);
    assert.equal(body.result.tasks[0].id, "work_one");
    assert.equal(body.result.tasks[0].contextId, "ctx-one");
    assert.equal(body.result.nextPageToken, "");
    assert.equal(body.result.pageSize, 1);
  } finally {
    await a2a.close();
    await new Promise<void>(resolve => controlServer.close(() => resolve()));
  }
});
