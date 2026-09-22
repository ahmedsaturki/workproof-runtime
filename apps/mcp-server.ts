import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import { ControlPlaneClient, WorkDispatchRequest } from "../packages/sdk/src/index";

const fs = require("fs");
const path = require("path");

export interface McpRuntimeOptions {
  controlPlaneUrl?: string;
  token?: string;
  version?: string;
}

function runtimeVersion(): string {
  const candidates = [
    path.resolve(path.dirname(__filename), "../../package.json"),
    path.resolve(process.cwd(), "package.json")
  ];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(fs.readFileSync(candidate, "utf8"));
      if (typeof parsed?.version === "string" && parsed.version.trim()) return parsed.version.trim();
    } catch {
      // Try the next known package location.
    }
  }
  const environmentVersion = process.env.npm_package_version;
  if (environmentVersion && environmentVersion.trim()) return environmentVersion.trim();
  return "unknown";
}

function jsonResult(value: unknown): { content: Array<{ type: "text"; text: string }>; structuredContent: unknown } {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
    structuredContent: value
  };
}

const riskClass = z.enum(["read", "local_write", "external_write", "destructive", "financial"]);
const idempotencyKey = z.string().regex(/^[A-Za-z0-9._~-]{1,200}$/);
const workId = z.string().regex(/^[A-Za-z0-9._-]+$/);

const stepSchema = z.object({
  id: z.string().min(1).max(200),
  operation: z.string().min(1).max(200),
  capability: z.string().min(1).max(200).optional(),
  input: z.unknown().optional(),
  idempotencyKey,
  riskClass,
  preferredCapabilities: z.array(z.string().min(1).max(200)).max(50).optional(),
  maxAttempts: z.number().int().min(1).max(5).optional()
});

const successSchema = z.object({
  id: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  verifier: z.string().min(1).max(200),
  required: z.boolean()
});

export function createMcpServer(options: McpRuntimeOptions = {}): McpServer {
  const control = new ControlPlaneClient({
    baseUrl: options.controlPlaneUrl ?? process.env.WORKPROOF_MCP_CONTROL_PLANE_URL ?? "http://127.0.0.1:8789",
    token: options.token ?? process.env.WORKPROOF_MCP_TOKEN
  });

  const server = new McpServer({
    name: "workproof-runtime",
    version: options.version ?? runtimeVersion()
  });

  server.registerTool(
    "workproof_capabilities",
    {
      title: "List WorkProof capabilities",
      description: "List the capabilities exposed by the authenticated WorkProof control plane. Metadata only; this does not authorize execution.",
      annotations: { readOnlyHint: true, openWorldHint: false },
      inputSchema: z.object({})
    },
    async () => jsonResult(await control.listCapabilities())
  );

  server.registerTool(
    "workproof_get_work",
    {
      title: "Get a Work Object",
      description: "Read a persisted WorkProof Work Object through the authenticated control plane.",
      annotations: { readOnlyHint: true, openWorldHint: false },
      inputSchema: z.object({ workId })
    },
    async ({ workId: id }) => jsonResult(await control.getWork(id))
  );

  const dispatchInput = z.object({
    objective: z.string().min(1).max(10000),
    inputs: z.record(z.string(), z.unknown()).optional(),
    constraints: z.record(z.string(), z.unknown()).optional(),
    success: z.array(successSchema).max(100).optional(),
    deliverables: z.array(z.string().min(1).max(2000)).max(100).optional(),
    riskClass: riskClass.optional(),
    approvalRequired: z.boolean().optional(),
    steps: z.array(stepSchema).max(100).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    idempotencyKey
  });

  server.registerTool(
    "workproof_dispatch",
    {
      title: "Dispatch Work",
      description: "Dispatch a bounded WorkProof mission through the authenticated control plane. Provide an idempotency key; execution still enforces WorkProof risk ceilings, policy, verification, reconciliation, recovery, and proof.",
      annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: true },
      inputSchema: dispatchInput
    },
    async ({ idempotencyKey: key, ...input }) => {
      const request = input as WorkDispatchRequest;
      return jsonResult(await control.dispatch(request, { idempotencyKey: key }));
    }
  );

  server.registerTool(
    "workproof_resume",
    {
      title: "Resume Work",
      description: "Resume a persisted Work Object through its stored mission definition. The idempotency key prevents duplicate control mutations.",
      annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: true },
      inputSchema: z.object({ workId, idempotencyKey })
    },
    async ({ workId: id, idempotencyKey: key }) => jsonResult(await control.resume(id, { idempotencyKey: key }))
  );

  server.registerTool(
    "workproof_cancel",
    {
      title: "Cancel Work",
      description: "Cancel non-terminal Work through the authenticated control plane. The same idempotency key can safely replay the completed control mutation.",
      annotations: { readOnlyHint: false, idempotentHint: true, destructiveHint: false, openWorldHint: true },
      inputSchema: z.object({ workId, idempotencyKey })
    },
    async ({ workId: id, idempotencyKey: key }) => jsonResult(await control.cancel(id, { idempotencyKey: key }))
  );

  return server;
}

export function runMcpServer(): void {
  void serveStdio(() => createMcpServer());
  console.error("WorkProof MCP server running on stdio");
}

if (require.main === module) runMcpServer();
