import { LeaseStatus, WorkerStatus } from "../../coordination/src/leases";
const { securePrivateDirectory, securePrivateFile } = require("../../storage/src/private-files");

const http = require("http");
const fs = require("fs");
const crypto = require("crypto");
const { URL } = require("url");
const { authorize, validateAuthPolicy } = require("../../registry/src/auth.js");
const {
  ControlIdempotencyLedger,
  fingerprintControlRequest,
  parseIdempotencyResponse
} = require("./idempotency.js");

export interface ControlPlaneRepository {
  load(id: string): import("../../core/src/types").WorkObject;
  save(work: import("../../core/src/types").WorkObject): string;
  list?(): string[];
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
  workerStatusSource?: { listWorkerStatuses(staleAfterMs: number): WorkerStatus[] };
  workerStaleAfterMs?: number;
  leaseStatusSource?: { listLeaseStatuses(): LeaseStatus[] };
  capabilitySource?: { listCapabilities(): Array<{ name: string; version: string; operations: string[]; riskClass: string }> };
  runtimeVersion?: string;
  telemetry?: { emit(entry: Record<string, unknown>): void | Promise<boolean> };
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
  const loopbackHosts = new Set(["127.0.0.1", "localhost", "::1"]);
  if (!loopbackHosts.has(host) && !options.authPolicy) {
    throw new Error("Refusing non-loopback control-plane binding without auth policy");
  }
  if (options.authPolicy) validateAuthPolicy(options.authPolicy);
  const auditPath = options.auditPath;
  const workerStaleAfterMs = options.workerStaleAfterMs ?? 30_000;
  if (!Number.isSafeInteger(workerStaleAfterMs) || workerStaleAfterMs <= 0) {
    throw new Error("Worker stale threshold must be a positive safe integer");
  }

  if (auditPath) {
    securePrivateDirectory(require("path").dirname(require("path").resolve(auditPath)));
    const auditFd = fs.openSync(auditPath, "a", 0o600);
    fs.closeSync(auditFd);
    securePrivateFile(auditPath);
  }

  const audit = (entry: Record<string, unknown>): void => {
    if (auditPath) fs.appendFileSync(auditPath, JSON.stringify(entry) + "\n", "utf8");
    if (options.telemetry) {
      try { void Promise.resolve(options.telemetry.emit(entry)).catch(() => {}); } catch {}
    }
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
    let activeIdempotencyKey: string | undefined;
    let activeIdempotencyOperation: string | undefined;

    try {
      const method = String(req.method ?? "GET").toUpperCase();
      const url = new URL(String(req.url ?? "/"), `http://${host}`);

      if (method === "GET" && url.pathname === "/health") {
        sendJson(res, 200, {
          status: "ok",
          version: options.runtimeVersion ?? "unknown",
          apiVersion: "1.0",
          requestId: id
        });
        return;
      }

      if (method === "GET" && url.pathname === "/ready") {
        const checks: Record<string, { status: "ok" | "failed"; detail?: string }> = {};
        try {
          if (!options.repository.list) throw new Error("repository list is not configured");
          options.repository.list();
          checks.repository = { status: "ok" };
        } catch (error) {
          checks.repository = { status: "failed", detail: String((error as any)?.message ?? error) };
        }
        if (options.idempotencyDbPath) {
          try {
            const parent = require("path").dirname(require("path").resolve(options.idempotencyDbPath));
            fs.mkdirSync(parent, { recursive: true });
            checks.idempotency = fs.existsSync(parent) ? { status: "ok" } : { status: "failed", detail: "idempotency parent directory unavailable" };
          } catch (error) {
            checks.idempotency = { status: "failed", detail: String((error as any)?.message ?? error) };
          }
        } else {
          checks.idempotency = { status: "ok", detail: "disabled" };
        }
        const ready = Object.values(checks).every((check) => check.status === "ok");
        sendJson(res, ready ? 200 : 503, {
          status: ready ? "ready" : "not-ready",
          version: options.runtimeVersion ?? "unknown",
          apiVersion: "1.0",
          requestId: id,
          checks
        });
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

      if (method === "GET" && url.pathname === "/v1/capabilities") {
        if (!options.capabilitySource) {
          sendJson(res, 503, { error: "capability-list-not-configured", requestId: id });
          return;
        }
        const capabilities = options.capabilitySource.listCapabilities()
          .map((capability) => ({
            name: capability.name,
            version: capability.version,
            operations: [...capability.operations].sort(),
            riskClass: capability.riskClass
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        sendJson(res, 200, {
          version: "1.0",
          requestId: id,
          capabilities
        });
        return;
      }

      if (method === "GET" && url.pathname === "/v1/leases") {
        if (!options.leaseStatusSource) {
          sendJson(res, 503, { error: "lease-status-not-configured", requestId: id });
          return;
        }
        sendJson(res, 200, {
          version: "2.8",
          requestId: id,
          leases: options.leaseStatusSource.listLeaseStatuses()
        });
        return;
      }

      if (method === "GET" && url.pathname === "/v1/workers") {
        if (!options.workerStatusSource) {
          sendJson(res, 503, { error: "worker-status-not-configured", requestId: id });
          return;
        }
        sendJson(res, 200, {
          version: "1.1",
          requestId: id,
          staleAfterMs: workerStaleAfterMs,
          workers: options.workerStatusSource.listWorkerStatuses(workerStaleAfterMs)
        });
        return;
      }

      if (method === "GET" && url.pathname === "/v1/work") {
        if (!options.repository.list) {
          sendJson(res, 503, { error: "work-list-not-configured", requestId: id });
          return;
        }
        const rawLimit = url.searchParams.get("limit");
        const limit = rawLimit === null ? 100 : Number(rawLimit);
        if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
          sendJson(res, 400, { error: "limit must be an integer from 1 to 100", requestId: id });
          return;
        }
        const rawOffset = url.searchParams.get("offset");
        const offset = rawOffset === null ? 0 : Number(rawOffset);
        if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1000000) {
          sendJson(res, 400, { error: "offset must be an integer from 0 to 1000000", requestId: id });
          return;
        }
        const status = url.searchParams.get("status");
        const contextId = url.searchParams.get("contextId");
        const includeArtifacts = url.searchParams.get("includeArtifacts") === "true";
        const files = options.repository.list();
        const works = files
          .filter((file) => file.endsWith(".json"))
          .map((file) => options.repository!.load(file.slice(0, -5)))
          .filter((work) =>
            (!status || String(work.status) === status) &&
            (!contextId || work.contract?.metadata?.a2aContextId === contextId)
          )
          .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
        sendJson(res, 200, {
          version: "1.2",
          requestId: id,
          total: works.length,
          offset,
          work: works.slice(offset, offset + limit).map((work) => ({
            id: work.id,
            objective: work.contract?.objective ?? "",
            status: work.status,
            riskClass: work.contract?.riskClass,
            approvalRequired: Boolean(work.contract?.approvalRequired),
            createdAt: work.createdAt,
            updatedAt: work.updatedAt,
            ...(typeof work.contract?.metadata?.a2aContextId === "string"
              ? { a2aContextId: work.contract.metadata.a2aContextId }
              : {}),
            ...(includeArtifacts
              ? {
                  artifacts: Array.isArray(work.artifacts)
                    ? work.artifacts.map((artifact) => ({
                        ...(typeof artifact?.uri === "string" ? { uri: artifact.uri } : {}),
                        ...(typeof artifact?.metadata?.mediaType === "string" ? { mediaType: artifact.metadata.mediaType } : {})
                      }))
                    : []
                }
              : {})
          }))
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
        activeIdempotencyKey = mutation.key;
        activeIdempotencyOperation = mutation.key ? "dispatch" : undefined;

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
        activeIdempotencyKey = mutation.key;
        activeIdempotencyOperation = mutation.key ? action : undefined;

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
      const status =
        /Unknown work|ENOENT|no such file/i.test(message)
          ? 404
          : (/Invalid work id|Invalid JSON|Idempotency-Key/i.test(message) ? 400 : 500);

      audit({
        version: "0.1",
        requestId: id,
        action: "error",
        operation: activeIdempotencyOperation,
        error: message,
        ...(activeIdempotencyKey ? { idempotencyKey: activeIdempotencyKey } : {}),
        at: new Date().toISOString()
      });

      if (activeIdempotencyKey && idempotency) {
        const publicError = status === 404
          ? "not-found"
          : (status === 400 ? "invalid-request" : "mutation-execution-failed");
        const safeFailure = {
          error: publicError,
          requestId: id
        };
        try {
          idempotency.fail(activeIdempotencyKey, status, safeFailure);
        } catch {}
        sendJson(res, status, safeFailure);
        return;
      }

      const publicError = status === 404
        ? "not-found"
        : (status === 400 ? "invalid-request" : "internal-server-error");
      sendJson(res, status, { error: publicError, requestId: id });
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
