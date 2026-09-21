const http = require("http");
const fs = require("fs");
const crypto = require("crypto");
const { URL } = require("url");
const { authorize } = require("../../registry/src/auth.js");
const {
  ControlIdempotencyLedger,
  fingerprintControlRequest,
  parseIdempotencyResponse
} = require("./idempotency.js");

export interface ControlPlaneRepository {
  load(id: string): import("../../core/src/types").WorkObject;
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
  idempotencyDbPath?: string;
}

export interface RunningControlPlane {
  host: string;
  port: number;
  server: any;
  close(): Promise<void>;
}

const MAX_BODY_BYTES = 1024 * 1024;

function sendJson(
  res: any,
  statusCode: number,
  body: Record<string, unknown>,
  extraHeaders: Record<string, string> = {}
): void {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "connection": "close",
    ...extraHeaders
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

function headerValue(req: any, name: string): string | null {
  const raw = req.headers?.[name.toLowerCase()];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value == null ? null : String(value).trim();
}

function requireIdempotencyKey(req: any): string {
  const key = headerValue(req, "idempotency-key");
  if (!key || !/^[A-Za-z0-9._~-]{1,200}$/.test(key)) {
    throw new Error("Idempotency-Key is required and must contain 1-200 safe characters");
  }
  return key;
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

  const idempotency = options.idempotencyDbPath
    ? new ControlIdempotencyLedger(options.idempotencyDbPath)
    : null;

  const beginIdempotentMutation = (
    req: any,
    res: any,
    operation: string,
    input: unknown,
    requestIdValue: string
  ): { handled: boolean; key?: string } => {
    if (!idempotency) return { handled: false };

    const key = requireIdempotencyKey(req);
    const claim = idempotency.claim(
      key,
      operation,
      fingerprintControlRequest(operation, input),
      requestIdValue
    );

    if (claim.status === "replay") {
      sendJson(
        res,
        claim.record.statusCode ?? 200,
        parseIdempotencyResponse(claim.record),
        { "x-idempotency-replayed": "true" }
      );
      return { handled: true };
    }

    if (claim.status === "conflict") {
      sendJson(res, 409, {
        error: "idempotency-key-conflict",
        requestId: requestIdValue
      });
      return { handled: true };
    }

    if (claim.status === "pending") {
      sendJson(res, 409, {
        error: "idempotency-in-progress",
        requestId: requestIdValue
      });
      return { handled: true };
    }

    return { handled: false, key };
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
        const work = options.repository.load(workId);
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
        try {
          input = JSON.parse(raw);
        } catch {
          sendJson(res, 400, { error: "invalid-json", requestId: id });
          return;
        }

        if (!input || typeof input !== "object" || Array.isArray(input)) {
          sendJson(res, 400, { error: "dispatch-body-must-be-object", requestId: id });
          return;
        }

        const mutation = beginIdempotentMutation(req, res, "dispatch", input, id);
        if (mutation.handled) return;

        const work = await options.dispatch(input);
        const response = { version: "1.0", requestId: id, work };

        if (mutation.key) {
          idempotency!.complete(mutation.key, 200, response);
        }

        audit({
          version: "0.1",
          requestId: id,
          action: "dispatch",
          workId: work.id,
          status: work.status,
          ...(mutation.key ? { idempotencyKey: mutation.key } : {}),
          at: new Date().toISOString()
        });
        sendJson(res, 200, response);
        return;
      }

      const actionMatch = /^\/v1\/work\/([A-Za-z0-9._-]+)\/(cancel|resume)$/.exec(url.pathname);
      if (method === "POST" && actionMatch) {
        const workId = requireWorkId(actionMatch[1]);
        const action = actionMatch[2];
        const work = options.repository.load(workId);

        const mutation = beginIdempotentMutation(req, res, action, { workId }, id);
        if (mutation.handled) return;

        if (action === "cancel") {
          if (work.status === "verified" || work.status === "failed") {
            const response = {
              error: `work-already-terminal:${work.status}`,
              requestId: id
            };
            if (mutation.key) idempotency!.complete(mutation.key, 409, response);
            sendJson(res, 409, response);
            return;
          }

          if (work.status !== "cancelled") {
            work.status = "cancelled";
            const eventAt = new Date().toISOString();
            work.events.push({
              id: `evt_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
              type: "control.cancelled",
              at: eventAt,
              message: "Work cancelled through authenticated control plane",
              data: { requestId: id }
            });
            work.updatedAt = eventAt;
            options.repository.save(work);
          }

          const response = { version: "1.0", requestId: id, work };
          if (mutation.key) idempotency!.complete(mutation.key, 200, response);
          audit({
            version: "0.1",
            requestId: id,
            action: "cancel",
            workId,
            status: work.status,
            ...(mutation.key ? { idempotencyKey: mutation.key } : {}),
            at: new Date().toISOString()
          });
          sendJson(res, 200, response);
          return;
        }

        if (!options.resume) {
          sendJson(res, 501, { error: "resume-not-configured", requestId: id });
          return;
        }

        if (work.status === "verified") {
          const response = { error: "work-already-verified", requestId: id };
          if (mutation.key) idempotency!.complete(mutation.key, 409, response);
          sendJson(res, 409, response);
          return;
        }

        const resumed = await options.resume(work);
        const response = { version: "1.0", requestId: id, work: resumed };
        if (mutation.key) idempotency!.complete(mutation.key, 200, response);
        audit({
          version: "0.1",
          requestId: id,
          action: "resume",
          workId,
          status: resumed.status,
          ...(mutation.key ? { idempotencyKey: mutation.key } : {}),
          at: new Date().toISOString()
        });
        sendJson(res, 200, response);
        return;
      }

      sendJson(res, 404, { error: "not-found", requestId: id });
    } catch (error) {
      const message = String(error);
      audit({
        version: "0.1",
        requestId: id,
        action: "error",
        error: message,
        at: new Date().toISOString()
      });

      const status =
        /Unknown work/i.test(message)
          ? 404
          : (/Invalid work id|Invalid JSON|Idempotency-Key/i.test(message) ? 400 : 500);

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
    close: () => new Promise((resolve, reject) => {
      server.closeAllConnections?.();
      server.close((error: unknown) => {
        try { idempotency?.close(); } catch {}
        error ? reject(error) : resolve();
      });
    })
  };
}
