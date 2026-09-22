const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { Client } = require("@modelcontextprotocol/client");
const { StdioClientTransport } = require("@modelcontextprotocol/client/stdio");
const { JsonWorkRepository } = require("../packages/storage/src/json");
const { startControlPlane } = require("../packages/control-plane/src/http");

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function sampleWork() {
  return {
    id: "mcp_seed_work",
    contract: {
      objective: "MCP seed work",
      inputs: {},
      constraints: {},
      success: [],
      deliverables: [],
      riskClass: "read",
      approvalRequired: false
    },
    status: "verified",
    events: [],
    effects: [],
    artifacts: [],
    createdAt: "2026-09-22T00:00:00.000Z",
    updatedAt: "2026-09-22T00:00:00.000Z"
  };
}

function textPayload(result) {
  assert.ok(Array.isArray(result.content));
  const textBlock = result.content.find(block => block.type === "text");
  assert.ok(textBlock);
  return JSON.parse(textBlock.text);
}

test("MCP stdio adapter exposes modern tool discovery and forwards through the authenticated control plane", async () => {
  const root = tempDir("workproof-mcp-adapter-");
  const repository = new JsonWorkRepository(path.join(root, "work"));
  repository.save(sampleWork());

  const issuedToken = "mcp-test-token";
  const control = await startControlPlane({
    repository,
    idempotencyDbPath: path.join(root, "control.sqlite"),
    authPolicy: {
      version: "0.1",
      credentials: [{
        version: "0.1",
        id: "mcp",
        secretHash: require("crypto").createHash("sha256").update(issuedToken, "utf8").digest("hex"),
        permissions: ["read", "write"],
        createdAt: "2026-09-22T00:00:00.000Z"
      }]
    },
    capabilitySource: {
      listCapabilities: () => [
        { name: "z.cap", version: "1.0.0", operations: ["z"], riskClass: "read" },
        { name: "a.cap", version: "2.0.0", operations: ["a"], riskClass: "local_write" }
      ]
    },
    runtimeVersion: "control-test"
  });

  let dispatchCount = 0;
  control.server.closeAllConnections?.();

  await control.close();

  const controlWithDispatch = await startControlPlane({
    repository,
    idempotencyDbPath: path.join(root, "control.sqlite"),
    authPolicy: {
      version: "0.1",
      credentials: [{
        version: "0.1",
        id: "mcp",
        secretHash: require("crypto").createHash("sha256").update(issuedToken, "utf8").digest("hex"),
        permissions: ["read", "write"],
        createdAt: "2026-09-22T00:00:00.000Z"
      }]
    },
    capabilitySource: {
      listCapabilities: () => [
        { name: "z.cap", version: "1.0.0", operations: ["z"], riskClass: "read" },
        { name: "a.cap", version: "2.0.0", operations: ["a"], riskClass: "local_write" }
      ]
    },
    runtimeVersion: "control-test",
    dispatch: async (input) => {
      dispatchCount += 1;
      const created = { ...sampleWork(), id: "mcp_created_" + dispatchCount };
      created.contract.objective = String(input.objective);
      repository.save(created);
      return created;
    }
  });

  const client = new Client(
    { name: "workproof-mcp-test", version: "1.0.0" },
    { versionNegotiation: { mode: "auto" } }
  );
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.resolve("dist/apps/mcp-server.js")],
    env: {
      ...process.env,
      WORKPROOF_MCP_CONTROL_PLANE_URL: "http://" + controlWithDispatch.host + ":" + controlWithDispatch.port,
      WORKPROOF_MCP_TOKEN: issuedToken
    },
    stderr: "pipe"
  });

  try {
    await client.connect(transport);

    const listed = await client.listTools();
    const names = listed.tools.map(tool => tool.name);
    assert.deepEqual(names, [
      "workproof_cancel",
      "workproof_capabilities",
      "workproof_dispatch",
      "workproof_get_work",
      "workproof_resume"
    ]);

    const capabilities = await client.callTool({
      name: "workproof_capabilities",
      arguments: {}
    });
    assert.equal(capabilities.isError, undefined);
    assert.deepEqual(textPayload(capabilities), [
      { name: "a.cap", version: "2.0.0", operations: ["a"], riskClass: "local_write" },
      { name: "z.cap", version: "1.0.0", operations: ["z"], riskClass: "read" }
    ]);

    const work = await client.callTool({
      name: "workproof_get_work",
      arguments: { workId: "mcp_seed_work" }
    });
    assert.equal(textPayload(work).id, "mcp_seed_work");

    const firstDispatch = await client.callTool({
      name: "workproof_dispatch",
      arguments: {
        objective: "MCP dispatch smoke",
        riskClass: "read",
        idempotencyKey: "mcp-dispatch-1"
      }
    });
    const firstWork = textPayload(firstDispatch);
    assert.equal(firstWork.contract.objective, "MCP dispatch smoke");
    assert.equal(dispatchCount, 1);

    const replay = await client.callTool({
      name: "workproof_dispatch",
      arguments: {
        objective: "MCP dispatch smoke",
        riskClass: "read",
        idempotencyKey: "mcp-dispatch-1"
      }
    });
    assert.equal(textPayload(replay).id, firstWork.id);
    assert.equal(dispatchCount, 1);

    const conflict = await client.callTool({
      name: "workproof_dispatch",
      arguments: {
        objective: "different MCP dispatch",
        riskClass: "read",
        idempotencyKey: "mcp-dispatch-1"
      }
    });
    assert.equal(conflict.isError, true);
  } finally {
    await client.close();
    await controlWithDispatch.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

export {};
