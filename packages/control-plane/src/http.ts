const http = require("http");
const fs = require("fs");
const crypto = require("crypto");
const { URL } = require("url");
const { authorize } = require("../../registry/src/auth.js");

export interface ControlPlaneRepository {
  get(id: string): import("../../core/src/types").WorkObject;
  save(work: import("../../core/src/types").WorkObject): string;
}

export interface ControlPlaneOptions {
  repository: ControlPlaneRepository;
  authPolicy?: import("../../registry/src/auth").RegistryAuthPolicy;
  host?: string;
  port?: number;
  auditPath?: string;
  dispatch?: (input: Record<string, unknown>) => Promise<import("../../core/src/types").WorkObject>;
  resume?: (work: import("../../core/src/types").WorkObject) => Promise<import("../../core/src/types").WorkObject>;
}

export interface RunningControlPlane {
  host: string;
  port: number;
  server: any;
  close(): Promise<void>;
}

const MAX_BODY_BYTES = 1024 * 1024;

function sendJson(res: any, statusCode: number, body: Record<string, unknown>): void {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload)
  });
  res.end(payload);
}

function readBody(req: any): Promise<string> {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks: any[] = [];
    req.on("data", (chunk: any) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
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

function requireWorkId(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9._-]+$/.test(value)) {
    throw new Error("Invalid work id");
  }
  return value;
}

function requestId(): string {
  return crypto.randomBytes(8).toString("hex");
}

export async function startControlPlane(options: ControlPlaneOptions): Promise<RunningControlPlane> {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 0;
  const auditPath = options.auditPath;
  if (auditPath) {
    fs.mkdirSync(require("path").dirname(require("path").resolve(auditPath)), { recursive: true });
    if (!fs.existsSync(auditPath)) fs.writeFileSync(auditPath, "", { encoding: "utf8", mode: 0o600 });
    fs.chmodSync(auditPath, 0o600);
  }

  const audit = (entry: Record<string, unknown>): void => {
    if (!auditPath) return;
    fs.appendFileSync(auditPath, JSON.stringify(entry) + "\n", "utf8");
  };

  const server = http.createServer(async (req: any, res: any) => {
    const id = requestId();
    try {
      const method = String(req.method ?? "GET").toUpperCase();
      const url = new URL(String(req.url ?? "/"), `http://${host}`);
      if (method === "GET" && url.pathname === "/health") {
        sendJson(res, 200, { status: "ok", version: "1.0", requestId: id });
        return;
      }

      let permission: "read" | "write" = "read";
      if (method === "POST") permission = "write";
      const decision = authorize(options.authPolicy, req.headers, permission);
      audit({
        version: "0.1",
        requestId: id,
        at: new Date().toISOString(),
        method,
        path: url.pathname,
        permission,
        allowed: decision.allowed,
        reason: decision.reason,
        ...(decision.credentialId ? { credentialId: decision.credentialId } : {})
      });
      if (!decision.allowed) {
        sendJson(res, decision.statusCode, {
          error: decision.statusCode === 401 ? "unauthorized" : "forbidden",
          requestId: id
        });
        return;
      }

      if (method === "GET") {
        const match = /^\/v1\/work\/([A-Za-z0-9._-]+)$/.exec(url.pathname);
        if (!match) {
          sendJson(res, 404, { error: "not-found", requestId: id });
          return;
        }
        const workId = requireWorkId(match[1]);
        const work = options.repository.get(workId);
        sendJson(res, 200, { version: "1.0", requestId: id, work });
        return;
      }

      if (method === "POST" && url.pathname === "/v1/work/dispatch") {
        if (!options.dispatch) {
          sendJson(res, 501, { error: "dispatch-not-configured", requestId: id });
          return;
        }
        const raw = await readBody(req);
        let input: Record<string, unknown>;
        try { input = JSON.parse(raw); } catch {
          sendJson(res, 400, { error: "invalid-json", requestId: id });
          return;
        }
        if (!input || typeof input !== "object" || Array.isArray(input)) {
          sendJson(res, 400, { error: "dispatch-body-must-be-object", requestId: id });
          return;
        }
        const work = await options.dispatch(input);
        audit({ version: "0.1", requestId: id, action: "dispatch", workId: work.id, status: work.status, at: new Date().toISOString() });
        sendJson(res, 200, { version: "1.0", requestId: id, work });
        return;
      }

      const actionMatch = /^\/v1\/work\/([A-Za-z0-9._-]+)\/(cancel|resume)$/.exec(url.pathname);
      if (method === "POST" && actionMatch) {
        const workId = requireWorkId(actionMatch[1]);
        const action = actionMatch[2];
        const work = options.repository.get(workId);

        if (action === "cancel") {
          if (work.status !== "cancelled") {
            work.status = "cancelled";
            work.events.push({
              id: `evt_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
              type: "control.cancelled",
              at: new Date().toISOString(),
              message: "Work cancelled through authenticated control plane",
              data: { requestId: id }
            });
            work.updatedAt = work.events[work.events.length - 1].at;
            options.repository.save(work);
          }
          audit({ version: "0.1", requestId: id, action: "cancel", workId, status: work.status, at: new Date().toISOString() });
          sendJson(res, 200, { version: "1.0", requestId: id, work });
          return;
        }

        if (!options.resume) {
          sendJson(res, 501, { error: "resume-not-configured", requestId: id });
          return;
        }
        if (work.status === "verified") {
          sendJson(res, 409, { error: "work-already-verified", requestId: id });
          return;
        }
        const resumed = await options.resume(work);
        audit({ version: "0.1", requestId: id, action: "resume", workId, status: resumed.status, at: new Date().toISOString() });
        sendJson(res, 200, { version: "1.0", requestId: id, work: resumed });
        return;
      }

      sendJson(res, 404, { error: "not-found", requestId: id });
    } catch (error) {
      const message = String(error);
      audit({ version: "0.1", requestId: id, action: "error", error: message, at: new Date().toISOString() });
      const status = /Unknown work/i.test(message) ? 404 : (/Invalid work id|Invalid JSON/i.test(message) ? 400 : 500);
      sendJson(res, status, { error: message, requestId: id });
    }
  });

  const actualPort = await new Promise<number>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Control plane did not expose a TCP address"));
        return;
      }
      resolve(address.port);
    });
  });

  return {
    host,
    port: actualPort,
    server,
    close: () => new Promise((resolve, reject) => server.close((error: unknown) => error ? reject(error) : resolve()))
  };
}
