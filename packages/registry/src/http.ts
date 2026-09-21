const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { URL } = require("url");
const { publishProof, listProofs, inspectProof } = require("../../evidence/src/vault.js");
const { digestProofBundle, verifyProofIntegrity } = require("../../evidence/src/integrity.js");

export const REGISTRY_VERSION = "1.0";
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

  const server = http.createServer(async (req: any, res: any) => {
    try {
      const method = String(req.method ?? "GET").toUpperCase();
      const url = new URL(String(req.url ?? "/"), `http://${host}`);

      if (method === "GET" && url.pathname === "/health") {
        sendJson(res, 200, { status: "ok", version: REGISTRY_VERSION });
        return;
      }

      if (method === "GET" && url.pathname === "/v1/proofs") {
        sendJson(res, 200, { version: REGISTRY_VERSION, records: listProofs(options.vaultDir) });
        return;
      }

      const routed = routeDigest(url.pathname);
      if (method === "GET" && routed) {
        const data = proofFromRecord(options.vaultDir, routed.digest);
        if (routed.content) {
          sendText(res, 200, "application/json; charset=utf-8", JSON.stringify(data, null, 2) + "\n");
        } else {
          sendJson(res, 200, { version: REGISTRY_VERSION, record: inspectProof(options.vaultDir, routed.digest), proof: data });
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
          const record = publishProof(bodyPath, options.vaultDir);
          const proof = proofFromRecord(options.vaultDir, record.digest);
          const idempotent = listProofs(options.vaultDir).filter((item: any) => item.digest === record.digest).length === 1;
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

      if (routed) {
        sendJson(res, 405, { error: "method-not-allowed" });
        return;
      }

      sendJson(res, 404, { error: "not-found" });
    } catch (error) {
      const message = String(error);
      const status = /integrity|digest|Invalid proof|Proof integrity/i.test(message) ? 422 : 500;
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
