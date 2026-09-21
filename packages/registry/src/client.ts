const { URL } = require("url");
const { digestProofBundle, verifyProofIntegrity } = require("../../evidence/src/integrity.js");

function proofBundle(data: any): Record<string, unknown> {
  return {
    version: data.version,
    work: data.work,
    effects: data.effects,
    artifacts: data.artifacts,
    verification: data.verification,
    events: data.events
  };
}

function assertValidProof(data: any): void {
  if (!data?.integrity || !verifyProofIntegrity(proofBundle(data), data.integrity)) {
    throw new Error("Proof integrity must verify before registry transport");
  }
}

function normalizeBaseUrl(registryUrl: string): string {
  const url = new URL(registryUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Registry URL must use HTTP or HTTPS");
  return url.toString().replace(/\/$/, "");
}

async function request(registryUrl: string, method: string, path: string, body?: unknown, token?: string): Promise<any> {
  const base = normalizeBaseUrl(registryUrl);
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const raw = await response.text();
  let data: any;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    throw new Error(`Registry returned invalid JSON (HTTP ${response.status})`);
  }
  if (!response.ok) throw new Error(data?.error ? String(data.error) : `Registry request failed (HTTP ${response.status})`);
  return data;
}

export async function publishProofToRegistry(registryUrl: string, proof: Record<string, unknown>, token?: string): Promise<Record<string, unknown>> {
  assertValidProof(proof);
  const expectedDigest = digestProofBundle(proofBundle(proof));
  const result = await request(registryUrl, "POST", "/v1/proofs", proof, token);
  if (result?.digest !== expectedDigest) throw new Error("Registry returned a mismatched proof digest");
  return result;
}

export async function getProofFromRegistry(registryUrl: string, digest: string, token?: string): Promise<Record<string, unknown>> {
  if (!/^[0-9a-f]{64}$/.test(digest)) throw new Error("Proof digest must be a lowercase SHA-256 hex value");
  const result = await request(registryUrl, "GET", `/v1/proofs/${digest}/content`, undefined, token);
  assertValidProof(result);
  if (digestProofBundle(proofBundle(result)) !== digest) throw new Error("Registry returned a mismatched proof digest");
  return result;
}

export async function listProofsFromRegistry(registryUrl: string, token?: string): Promise<Record<string, unknown>[]> {
  const result = await request(registryUrl, "GET", "/v1/proofs", undefined, token);
  if (!Array.isArray(result?.records)) throw new Error("Registry returned an invalid proof list");
  return result.records;
}


const { digestTrustPolicySnapshot, verifyTrustPolicySnapshotSignature } = require("../../evidence/src/trust-sync.js");
import type { TrustPolicySnapshot, TrustSnapshotDecision } from "../../evidence/src/trust-sync";

function assertValidTrustSnapshot(snapshot: TrustPolicySnapshot): void {
  if (!snapshot?.signature) throw new Error("Trust snapshot signature is required");
  if (digestTrustPolicySnapshot(snapshot) !== snapshot.digest) throw new Error("Trust snapshot digest is invalid");
  if (!verifyTrustPolicySnapshotSignature(snapshot)) throw new Error("Trust snapshot signature is invalid");
}

export async function publishTrustSnapshotToRegistry(registryUrl: string, snapshot: TrustPolicySnapshot, token?: string): Promise<Record<string, unknown>> {
  assertValidTrustSnapshot(snapshot);
  const result = await request(registryUrl, "POST", "/v1/trust/snapshots", snapshot, token);
  if (result?.record?.digest !== snapshot.digest) throw new Error("Registry returned a mismatched trust snapshot digest");
  return result;
}

export async function getTrustSnapshotFromRegistry(registryUrl: string, digest: string, token?: string): Promise<TrustPolicySnapshot> {
  if (!/^[0-9a-f]{64}$/.test(digest)) throw new Error("Trust snapshot digest must be a lowercase SHA-256 hex value");
  const result = await request(registryUrl, "GET", `/v1/trust/snapshots/${digest}`, undefined, token);
  if (!result?.snapshot) throw new Error("Registry returned no trust snapshot");
  const snapshot = result.snapshot as TrustPolicySnapshot;
  assertValidTrustSnapshot(snapshot);
  if (snapshot.digest !== digest) throw new Error("Registry returned a mismatched trust snapshot digest");
  return snapshot;
}

export async function listTrustSnapshotsFromRegistry(registryUrl: string, token?: string): Promise<Record<string, unknown>[]> {
  const result = await request(registryUrl, "GET", "/v1/trust/snapshots", undefined, token);
  if (!Array.isArray(result?.records)) throw new Error("Registry returned an invalid trust snapshot list");
  return result.records;
}

export async function getCurrentTrustSnapshotFromRegistry(registryUrl: string, token?: string): Promise<TrustPolicySnapshot | null> {
  try {
    const result = await request(registryUrl, "GET", "/v1/trust/current", undefined, token);
    const snapshot = (result?.snapshot ?? null) as TrustPolicySnapshot | null;
    if (snapshot) assertValidTrustSnapshot(snapshot);
    return snapshot;
  } catch (error) {
    if (String(error).includes("no-current-trust-snapshot")) return null;
    throw error;
  }
}

export async function applyTrustSnapshotToRegistry(registryUrl: string, digest: string, token?: string, allowRollback = false): Promise<{ status: TrustSnapshotDecision; current: TrustPolicySnapshot }> {
  if (!/^[0-9a-f]{64}$/.test(digest)) throw new Error("Trust snapshot digest must be a lowercase SHA-256 hex value");
  const result = await request(registryUrl, "POST", "/v1/trust/apply", { digest, ...(allowRollback ? { allowRollback: true } : {}) }, token);
  if (!result?.current) throw new Error("Registry returned no current trust snapshot");
  return { status: result.status as TrustSnapshotDecision, current: result.current as TrustPolicySnapshot };
}
