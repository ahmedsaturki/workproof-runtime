const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
import { ControlPlaneClient, WorkDispatchRequest } from "../packages/sdk/src/index";

const protocolVersion = "1.0";
const maxBodyBytes = 1024 * 1024;

export interface A2AOptions {
  host?: string;
  port?: number;
  controlPlaneUrl?: string;
  token: string;
  publicUrl?: string;
}

interface RunningA2A {
  host: string;
  port: number;
  close(): Promise<void>;
  server: any;
}

function version(): string {
  const candidates = [
    path.resolve(path.dirname(__filename), "../..", "package.json")
  ];
  for (const candidate of candidates) {
    try {
      const value = JSON.parse(fs.readFileSync(candidate, "utf8")).version;
      if (typeof value === "string" && value.trim()) return value.trim();
    } catch {}
  }
  return "unknown";
}

function authMatches(header: unknown, token: string): boolean {
  const value = Array.isArray(header) ? header[0] : header;
  const text = String(value ?? "").trim();
  const match = /^Bearer ([A-Za-z0-9._~-]+)$/.exec(text);
  if (!match) return false;
  const actual = Buffer.from(match[1]);
  const expected = Buffer.from(token);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function readBody(req: any): Promise<string> {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks: any[] = [];
    req.on("data", (chunk: any) => {
      total += chunk.length;
      if (total > maxBodyBytes) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function rpcError(id: unknown, code: number, message: string, data?: unknown): Record<string, unknown> {
  return { jsonrpc: "2.0", ...(id === undefined ? {} : { id }), error: { code, message, ...(data === undefined ? {} : { data }) } };
}

function send(res: any, status: number, body: Record<string, unknown>, headers: Record<string, string> = {}): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...headers
  });
  res.end(payload);
}

function taskState(status: string): string {
  if (status === "verified") return "TASK_STATE_COMPLETED";
  if (status === "cancelled") return "TASK_STATE_CANCELED";
  if (status === "failed" || status === "unresolved" || status === "unverifiable") return "TASK_STATE_FAILED";
  if (status === "planned") return "TASK_STATE_SUBMITTED";
  return "TASK_STATE_WORKING";
}

function textFromMessage(message: any): string {
  if (!message || message.role !== "ROLE_USER" || !Array.isArray(message.parts) || message.parts.length < 1) {
    throw Object.assign(new Error("SendMessage requires a ROLE_USER message with at least one part"), { rpcCode: -32602 });
  }
  const values: string[] = [];
  for (const part of message.parts) {
    if (part?.text !== undefined && typeof part.text === "string" && part.text.length > 0) values.push(part.text);
    else throw Object.assign(new Error("Only text message parts are supported"), { rpcCode: -32005 });
  }
  const text = values.join("\n").trim();
  if (!text) throw Object.assign(new Error("Message text must not be empty"), { rpcCode: -32602 });
  return text;
}

function workContextId(work: any, fallback: string): string {
  const value = work?.contract?.metadata?.a2aContextId ?? work?.a2aContextId;
  return typeof value === "string" && value.trim() ? value : fallback;
}

function workTask(work: any, contextId?: string): Record<string, unknown> {
  const resolvedContextId = workContextId(work, contextId ?? "a2a-" + String(work?.id ?? "unknown"));
  const status = taskState(String(work.status));
  const statusMessage = {
    messageId: crypto.createHash("sha256").update(work.id + ":" + work.updatedAt, "utf8").digest("hex").slice(0, 32),
    role: "ROLE_AGENT",
    parts: [{ text: "WorkProof status: " + String(work.status) }],
    taskId: work.id,
    contextId: resolvedContextId
  };
  const artifacts = Array.isArray(work.artifacts)
    ? work.artifacts.filter((artifact: any) => typeof artifact?.uri === "string").map((artifact: any) => ({
        artifactId: artifact.id,
        parts: [{ url: artifact.uri, mediaType: artifact.metadata?.mediaType ?? "application/octet-stream" }]
      }))
    : [];
  return {
    id: work.id,
    contextId: resolvedContextId,
    status: { state: status, timestamp: work.updatedAt, message: statusMessage },
    ...(artifacts.length ? { artifacts } : {}),
    metadata: {
      workproof: {
        workId: work.id,
        status: work.status,
        riskClass: work.contract?.riskClass,
        verified: Boolean(work.verification && work.verification.status === "verified")
      }
    }
  };
}

function dispatchRequest(message: any, text: string): WorkDispatchRequest {
  const wp = message?.metadata?.workproof;
  const context: Record<string, unknown> = wp && typeof wp === "object" && !Array.isArray(wp) ? wp : {};
  const recognized = ["inputs", "constraints", "success", "deliverables", "riskClass", "approvalRequired", "steps", "metadata"];
  const request: Record<string, unknown> = { objective: text };
  for (const key of recognized) {
    if (Object.prototype.hasOwnProperty.call(context, key)) request[key] = context[key];
  }
  return request as unknown as WorkDispatchRequest;
}

function idempotencyFor(prefix: string, value: string): string {
  return "a2a." + prefix + "." + crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

export async function startA2AServer(options: A2AOptions): Promise<RunningA2A> {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 8790;
  const controlPlaneUrl = options.controlPlaneUrl ?? "http://127.0.0.1:8789";
  const token = options.token;
  let publicUrl = options.publicUrl;
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("A2A port must be a valid TCP port");
  if (!token || !/^[A-Za-z0-9._~-]{16,4096}$/.test(token)) throw new Error("A2A bearer token is required and must be a safe bearer token");
  const control = new ControlPlaneClient({ baseUrl: controlPlaneUrl, token });
  const server = http.createServer(async (req: any, res: any) => {
    const method = String(req.method ?? "GET").toUpperCase();
    const requestUrl = new URL(String(req.url ?? "/"), publicUrl ?? "http://" + host + ":" + port);

    if (method === "GET" && requestUrl.pathname === "/health") {
      send(res, 200, { status: "ok", version: version(), a2aProtocolVersion: protocolVersion });
      return;
    }

    if (method === "GET" && requestUrl.pathname === "/.well-known/agent-card.json") {
      const card = {
        name: "WorkProof Runtime",
        description: "Outcome-first digital work agent backed by durable Work Objects, independent verification, recovery, and portable proof.",
        supportedInterfaces: [{ url: (publicUrl ?? "http://" + host + ":" + port) + "/rpc", protocolBinding: "JSONRPC", protocolVersion }],
        version: version(),
        capabilities: { streaming: false, pushNotifications: false, extendedAgentCard: false },
        defaultInputModes: ["text"],
        defaultOutputModes: ["text"],
        skills: [{
          id: "digital-work",
          name: "Digital work execution",
          description: "Accept bounded outcomes and execute them through WorkProof.",
          tags: ["work", "verification", "proof"]
        }],
        securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "WorkProof token" } },
        securityRequirements: [{ bearerAuth: [] }]
      };
      const body = JSON.stringify(card);
      const etag = crypto.createHash("sha256").update(body, "utf8").digest("hex");
      if (String(req.headers?.["if-none-match"] ?? "") === '"' + etag + '"') {
        res.writeHead(304, { etag: '"' + etag + '"', "cache-control": "public, max-age=300" });
        res.end();
        return;
      }
      send(res, 200, card, { etag: '"' + etag + '"', "cache-control": "public, max-age=300" });
      return;
    }

    if (requestUrl.pathname !== "/rpc" || method !== "POST") {
      send(res, 404, { error: "not-found" });
      return;
    }

    if (!authMatches(req.headers?.authorization, token)) {
      send(res, 401, rpcError(undefined, -32002, "Authentication required"), { "www-authenticate": 'Bearer realm="workproof-a2a"' });
      return;
    }

    const headerVersion = String(req.headers?.["a2a-version"] ?? "").trim();
    if (headerVersion !== protocolVersion) {
      send(res, 400, rpcError(undefined, -32009, "Unsupported A2A protocol version", { supported: [protocolVersion] }));
      return;
    }

    let body: any;
    try {
      body = JSON.parse(await readBody(req));
    } catch {
      send(res, 400, rpcError(undefined, -32700, "Parse error"));
      return;
    }

    if (!body || body.jsonrpc !== "2.0" || (typeof body.id !== "string" && typeof body.id !== "number" && body.id !== null) || typeof body.method !== "string") {
      send(res, 400, rpcError(body?.id, -32600, "Invalid Request"));
      return;
    }

    try {
      if (body.method === "SendMessage") {
        const message = body.params?.message;
        if (!message || typeof message.messageId !== "string" || !message.messageId.trim()) {
          throw Object.assign(new Error("SendMessage requires message.messageId"), { rpcCode: -32602 });
        }
        if (message.taskId) throw Object.assign(new Error("Multi-turn task messages are not supported by this adapter"), { rpcCode: -32004 });
        const objective = textFromMessage(message);
        const contextId = typeof message.contextId === "string" && message.contextId.trim()
          ? message.contextId.trim()
          : "a2a-" + crypto.createHash("sha256").update(message.messageId, "utf8").digest("hex").slice(0, 32);
        const request = dispatchRequest(message, objective);
        request.metadata = {
          ...(request.metadata ?? {}),
          a2aContextId: contextId
        };
        const work = await control.dispatch(request, { idempotencyKey: idempotencyFor("message", message.messageId) });
        send(res, 200, { jsonrpc: "2.0", id: body.id, result: { task: workTask(work, contextId) } });
        return;
      }

      if (body.method === "GetTask") {
        const taskId = body.params?.id;
        if (typeof taskId !== "string" || !/^[A-Za-z0-9._-]+$/.test(taskId)) throw Object.assign(new Error("GetTask requires params.id"), { rpcCode: -32602 });
        const work = await control.getWork(taskId);
        send(res, 200, { jsonrpc: "2.0", id: body.id, result: { task: workTask(work, "a2a-" + taskId) } });
        return;
      }

      if (body.method === "CancelTask") {
        const taskId = body.params?.id;
        if (typeof taskId !== "string" || !/^[A-Za-z0-9._-]+$/.test(taskId)) throw Object.assign(new Error("CancelTask requires params.id"), { rpcCode: -32602 });
        const work = await control.cancel(taskId, { idempotencyKey: idempotencyFor("cancel", taskId) });
        send(res, 200, { jsonrpc: "2.0", id: body.id, result: { task: workTask(work, "a2a-" + taskId) } });
        return;
      }

      if (body.method === "ListTasks") {
        const params = body.params && typeof body.params === "object" && !Array.isArray(body.params) ? body.params : {};
        if (params.contextId !== undefined && typeof params.contextId !== "string") {
          throw Object.assign(new Error("ListTasks contextId must be a string"), { rpcCode: -32602 });
        }
        const pageSize = params.pageSize === undefined ? 50 : Number(params.pageSize);
        if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) {
          throw Object.assign(new Error("ListTasks pageSize must be an integer from 1 to 100"), { rpcCode: -32602 });
        }
        const tokenValue = params.pageToken === undefined ? "" : String(params.pageToken);
        if (tokenValue && !/^[A-Za-z0-9._~-]{1,64}$/.test(tokenValue)) {
          throw Object.assign(new Error("Invalid ListTasks pageToken"), { rpcCode: -32602 });
        }
        const offset = tokenValue ? Number(Buffer.from(tokenValue, "base64url").toString("utf8")) : 0;
        if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1000000) {
          throw Object.assign(new Error("Invalid ListTasks pageToken"), { rpcCode: -32602 });
        }
        let statusFilter: string | undefined;
        if (params.status !== undefined) {
          const map: Record<string, string> = {
            TASK_STATE_SUBMITTED: "planned",
            TASK_STATE_WORKING: "running",
            TASK_STATE_COMPLETED: "verified",
            TASK_STATE_FAILED: "failed",
            TASK_STATE_CANCELED: "cancelled"
          };
          statusFilter = map[String(params.status)];
          if (!statusFilter) throw Object.assign(new Error("Unsupported ListTasks status filter"), { rpcCode: -32602 });
        }
        const page = await control.listWorkPage({
          limit: pageSize,
          offset,
          status: statusFilter,
          contextId: params.contextId === undefined ? undefined : String(params.contextId),
          includeArtifacts: params.includeArtifacts === true
        });
        const tasks = page.items.map(item => workTask(item));
        const nextOffset = offset + tasks.length;
        const nextPageToken = nextOffset < page.total
          ? Buffer.from(String(nextOffset)).toString("base64url")
          : "";
        send(res, 200, {
          jsonrpc: "2.0",
          id: body.id,
          result: {
            tasks,
            nextPageToken,
            pageSize,
            totalSize: page.total
          }
        });
        return;
      }

      throw Object.assign(new Error("Method not found"), { rpcCode: -32601 });
    } catch (error) {
      const code = Number((error as any)?.rpcCode ?? (/not found|Unknown work/i.test(String(error)) ? -32001 : -32603));
      const status = code === -32001 ? 404 : (code === -32601 ? 404 : 400);
      send(res, status, rpcError(body.id, code, String((error as any)?.message ?? error)));
    }
  });

  const actualPort = await new Promise<number>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("A2A server did not expose a TCP address"));
        return;
      }
      resolve(address.port);
    });
  });

  if (!publicUrl) publicUrl = "http://" + host + ":" + actualPort;
  if (host !== "127.0.0.1" && host !== "localhost" && host !== "::1" && publicUrl.startsWith("http://")) {
    process.stderr.write("Warning: non-loopback A2A deployments should use HTTPS at the edge.\n");
  }

  return {
    host,
    port: actualPort,
    server,
    close: () => new Promise((resolve, reject) => server.close((error: unknown) => error ? reject(error) : resolve()))
  };
}

async function main(): Promise<void> {
  const running = await startA2AServer({
    host: process.env.WORKPROOF_A2A_HOST ?? "127.0.0.1",
    port: Number(process.env.WORKPROOF_A2A_PORT ?? "8790"),
    controlPlaneUrl: process.env.WORKPROOF_A2A_CONTROL_PLANE_URL ?? "http://127.0.0.1:8789",
    token: process.env.WORKPROOF_A2A_TOKEN ?? "",
    publicUrl: process.env.WORKPROOF_A2A_PUBLIC_URL
  });
  process.stdout.write(JSON.stringify({ status: "ready", version: version(), a2aProtocolVersion: protocolVersion, host: running.host, port: running.port }) + "\n");
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(String(error) + "\n");
    process.exitCode = 1;
  });
}
