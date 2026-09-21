const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { authorize, namespaceVault } = require("./auth");
const { URL } = require("url");
const { publishProof, listProofs, inspectProof } = require("../../evidence/src/vault.js");
const { digestProofBundle, verifyProofIntegrity } = require("../../evidence/src/integrity.js");
const {
  publishTrustSnapshot,
  getTrustSnapshot,
  listTrustSnapshots,
  getCurrentTrustSnapshot,
  applyTrustSnapshot
} = require("./trust-snapshots.js");

export const REGISTRY_VERSION = "1.2";
const MAX_BODY_BYTES = 5 * 1024 * 1024;

function sendJson(res: any, statusCode: number, body: Record<string, unknown>): void {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload)
  });
  res.end(payload);
}

function sendText(res: any, statusCode: number, contentType: string, body: string): void {
  res.writeHead(statusCode, {
    "content-type": contentType,
    "content-length": Buffer.byteLength(body)
  });
  res.end(body);
}

function proofBundleFromFile(data: any): Record<string, unknown> {
  return {
    version: data.version,
    work: data.work,
    effects: data.effects,
    sagas: data.sagas ?? [],
    artifacts: data.artifacts,
    verification: data.verification,
    events: data.events
  };
}

function isDigest(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

function routeDigest(url: string): { digest: string; content: boolean } | null {
  const match = /^\/v1\/proofs\/([0-9a-f]{64})(\/content)?$/.exec(url);
  if (!match) return null;
  return { digest: match[1], content: Boolean(match[2]) };
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

function proofFromRecord(vaultDir: string, digest: string): Record<string, unknown> {
  const record = inspectProof(vaultDir, digest);
  const raw = fs.readFileSync(record.proofPath, "utf8");
  const data = JSON.parse(raw);
  if (!data?.integrity || !verifyProofIntegrity(proofBundleFromFile(data), data.integrity)) {
    throw new Error("Vault proof failed integrity verification");
  }
  if (data.integrity.digest !== digest || digestProofBundle(proofBundleFromFile(data)) !== digest) {
    throw new Error("Vault proof digest mismatch");
  }
  return data;
}

export interface RegistryServerOptions {
  vaultDir: string;
  host?: string;
  port?: number;
  authPolicy?: import("./auth").RegistryAuthPolicy;
  trustedAdminKeyIds?: Set<string> | string[];
  trustedAdminKeyIdsByNamespace?: Record<string, Set<string> | string[]>;
}

export interface RunningRegistryServer {
  host: string;
  port: number;
  server: any;
  close(): Promise<void>;
}

async function listen(server: any, port: number, host: string): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Registry server did not expose a TCP address"));
        return;
      }
      resolve(address.port);
    });
  });
}

export async function startRegistryServer(options: RegistryServerOptions): Promise<RunningRegistryServer> {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 0;
  fs.mkdirSync(options.vaultDir, { recursive: true });

  const trustedAdminKeyIds = new Set(options.trustedAdminKeyIds ?? []);
  const trustedAdminKeyIdsByNamespace = new Map<string, Set<string>>();
  for (const [namespace, keyIds] of Object.entries(options.trustedAdminKeyIdsByNamespace ?? {})) {
    const safeNamespace = require("./auth").validateNamespace(namespace);
    trustedAdminKeyIdsByNamespace.set(safeNamespace, new Set(keyIds));
  }
  const trustedKeysForNamespace = (namespace?: string): Set<string> =>
    namespace === undefined
      ? trustedAdminKeyIds
      : (trustedAdminKeyIdsByNamespace.get(namespace) ?? new Set<string>());
  const auditPath = path.join(options.vaultDir, "auth-events.jsonl");
  if (!fs.existsSync(auditPath)) fs.writeFileSync(auditPath, "", { encoding: "utf8", mode: 0o600 });
  fs.chmodSync(auditPath, 0o600);
  const audit = (entry: Record<string, unknown>): void => {
    fs.appendFileSync(auditPath, JSON.stringify(entry) + "\n", "utf8");
  };

  const server = http.createServer(async (req: any, res: any) => {
    try {
      const method = String(req.method ?? "GET").toUpperCase();
      const url = new URL(String(req.url ?? "/"), `http://${host}`);

      if (method === "GET" && url.pathname === "/health") {
        sendJson(res, 200, { status: "ok", version: REGISTRY_VERSION });
        return;
      }

      let requiredPermission: "read" | "write" | "trust" = "read";
      if (method === "POST" && url.pathname === "/v1/proofs") requiredPermission = "write";
      if (url.pathname.startsWith("/v1/trust/")) requiredPermission = "trust";
      const decision = authorize(options.authPolicy, req.headers, requiredPermission);
      const requestId = crypto.randomBytes(8).toString("hex");
      audit({
        version: "0.1",
        requestId,
        at: new Date().toISOString(),
        method,
        path: url.pathname,
        permission: requiredPermission,
        allowed: decision.allowed,
        reason: decision.reason,
        ...(decision.credentialId ? { credentialId: decision.credentialId } : {}),
        ...(decision.namespace ? { namespace: decision.namespace } : {})
      });
      if (!decision.allowed) {
        sendJson(res, decision.statusCode, {
          error: decision.statusCode === 401 ? "unauthorized" : "forbidden",
          requestId
        });
        return;
      }

      const effectiveVault = namespaceVault(options.vaultDir, decision.namespace);

      if (method === "GET" && url.pathname === "/v1/trust/snapshots") {
        sendJson(res, 200, { version: REGISTRY_VERSION, records: listTrustSnapshots(effectiveVault) });
        return;
      }

      if (method === "GET" && url.pathname === "/v1/trust/current") {
        const current = getCurrentTrustSnapshot(effectiveVault, trustedKeysForNamespace(decision.namespace));
        if (!current) { sendJson(res, 404, { error: "no-current-trust-snapshot" }); return; }
        sendJson(res, 200, { version: REGISTRY_VERSION, snapshot: current });
        return;
      }

      const trustDigestMatch = /^\/v1\/trust\/snapshots\/([0-9a-f]{64})$/.exec(url.pathname);
      if (method === "GET" && trustDigestMatch) {
        const snapshot = getTrustSnapshot(effectiveVault, trustDigestMatch[1], trustedKeysForNamespace(decision.namespace));
        sendJson(res, 200, { version: REGISTRY_VERSION, snapshot });
        return;
      }

      if (method === "POST" && url.pathname === "/v1/trust/snapshots") {
        const raw = await readBody(req);
        let snapshot: any;
        try { snapshot = JSON.parse(raw); } catch { sendJson(res, 400, { error: "invalid-json" }); return; }
        const record = publishTrustSnapshot(effectiveVault, snapshot, trustedKeysForNamespace(decision.namespace));
        sendJson(res, 200, { version: REGISTRY_VERSION, status: "published", record, snapshot });
        return;
      }

      if (method === "POST" && url.pathname === "/v1/trust/apply") {
        const raw = await readBody(req);
        let input: any;
        try { input = JSON.parse(raw); } catch { sendJson(res, 400, { error: "invalid-json" }); return; }
        if (!input?.digest || !/^[0-9a-f]{64}$/.test(input.digest)) { sendJson(res, 400, { error: "trust-snapshot-digest-required" }); return; }
        const snapshot = getTrustSnapshot(effectiveVault, input.digest, trustedKeysForNamespace(decision.namespace));
        const applied = applyTrustSnapshot(effectiveVault, snapshot, trustedKeysForNamespace(decision.namespace), Boolean(input.allowRollback));
        sendJson(res, 200, { version: REGISTRY_VERSION, status: applied.decision, current: applied.current });
        return;
      }

      if (method === "GET" && url.pathname === "/v1/proofs") {
        sendJson(res, 200, { version: REGISTRY_VERSION, records: listProofs(effectiveVault) });
        return;
      }

      const routed = routeDigest(url.pathname);
      if (method === "GET" && routed) {
        const data = proofFromRecord(effectiveVault, routed.digest);
        if (routed.content) {
          sendText(res, 200, "application/json; charset=utf-8", JSON.stringify(data, null, 2) + "\n");
        } else {
          sendJson(res, 200, { version: REGISTRY_VERSION, record: inspectProof(effectiveVault, routed.digest), proof: data });
        }
        return;
      }

      if (method === "POST" && url.pathname === "/v1/proofs") {
        const raw = await readBody(req);
        let data: any;
        try {
          data = JSON.parse(raw);
        } catch {
          sendJson(res, 400, { error: "invalid-json" });
          return;
        }

        const bodyDir = fs.mkdtempSync(path.join(os.tmpdir(), "workproof-registry-"));
        const bodyPath = path.join(bodyDir, "proof.json");
        try {
          fs.writeFileSync(bodyPath, JSON.stringify(data));
          const record = publishProof(bodyPath, effectiveVault);
          const proof = proofFromRecord(effectiveVault, record.digest);
          const idempotent = listProofs(effectiveVault).filter((item: any) => item.digest === record.digest).length === 1;
          sendJson(res, 200, {
            version: REGISTRY_VERSION,
            digest: record.digest,
            workId: record.workId,
            record,
            proof,
            idempotent
          });
        } finally {
          fs.rmSync(bodyDir, { recursive: true, force: true });
        }
        return;
      }

      if (trustDigestMatch || url.pathname === "/v1/trust/snapshots" || url.pathname === "/v1/trust/current" || url.pathname === "/v1/trust/apply") {
        sendJson(res, 405, { error: "method-not-allowed" });
        return;
      }

      if (routed) {
        sendJson(res, 405, { error: "method-not-allowed" });
        return;
      }

      sendJson(res, 404, { error: "not-found" });
    } catch (error) {
      const message = String(error);
      const status = /Unknown (proof|trust snapshot) digest|no-current-trust-snapshot/i.test(message) ? 404 : (/untrusted-signer|trust snapshot (conflict|rollback-required)/i.test(message) ? 403 : (/invalid|integrity|digest|Invalid proof|Proof integrity/i.test(message) ? 422 : 500));
      sendJson(res, status, { error: message });
    }
  });

  const actualPort = await listen(server, port, host);
  return {
    host,
    port: actualPort,
    server,
    close: () => new Promise((resolve, reject) => server.close((error: unknown) => error ? reject(error) : resolve()))
  };
}
