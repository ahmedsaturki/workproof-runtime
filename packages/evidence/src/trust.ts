const fs = require("fs");
const crypto = require("crypto");
const { proofKeyId } = require("./signature");

export type TrustState = "trusted" | "revoked";

export interface TrustedKeyRecord {
  keyId: string;
  publicKey: string;
  state: TrustState;
  label?: string;
  createdAt: string;
  updatedAt: string;
  reason?: string;
}

export interface TrustPolicyDocument {
  version: "0.1";
  keys: TrustedKeyRecord[];
}

function now(): string {
  return new Date().toISOString();
}

function normalizePublicKey(publicKey: string): string {
  return publicKey.replace(/\r\n/g, "\n").trim() + "\n";
}

export function createTrustPolicy(): TrustPolicyDocument {
  return { version: "0.1", keys: [] };
}

export function validateTrustPolicy(policy: TrustPolicyDocument): void {
  if (!policy || policy.version !== "0.1" || !Array.isArray(policy.keys)) {
    throw new Error("Invalid trust policy document");
  }
  const seen = new Set<string>();
  for (const key of policy.keys) {
    if (!key || !/^[0-9a-f]{32}$/.test(key.keyId)) throw new Error("Invalid trusted key ID");
    if (key.state !== "trusted" && key.state !== "revoked") throw new Error("Invalid trusted key state");
    if (typeof key.publicKey !== "string" || !key.publicKey.includes("BEGIN PUBLIC KEY")) {
      throw new Error("Invalid trusted public key");
    }
    if (seen.has(key.keyId)) throw new Error(`Duplicate trusted key ID: ${key.keyId}`);
    seen.add(key.keyId);
  }
}

export function loadTrustPolicy(filePath: string): TrustPolicyDocument {
  if (!fs.existsSync(filePath)) return createTrustPolicy();
  const policy = JSON.parse(fs.readFileSync(filePath, "utf8"));
  validateTrustPolicy(policy);
  return policy;
}

export function saveTrustPolicy(filePath: string, policy: TrustPolicyDocument): void {
  validateTrustPolicy(policy);
  fs.writeFileSync(filePath, JSON.stringify(policy, null, 2) + "\n", "utf8");
}

export function trustKey(policy: TrustPolicyDocument, publicKey: string, label?: string): TrustedKeyRecord {
  validateTrustPolicy(policy);
  const normalized = normalizePublicKey(publicKey);
  const publicKeyObject = crypto.createPublicKey(normalized);
  if (publicKeyObject.asymmetricKeyType !== "ed25519") {
    throw new Error("Trusted proof keys must be Ed25519 public keys");
  }
  const keyId = proofKeyId(normalized);
  const existing = policy.keys.find((key) => key.keyId === keyId);
  const timestamp = now();

  if (existing) {
    if (existing.publicKey !== normalized) throw new Error("Key ID collision with different public key");
    if (existing.state === "revoked") throw new Error("Key is revoked; rotate with a new identity instead");
    if (label) existing.label = label;
    existing.updatedAt = timestamp;
    return existing;
  }

  const record: TrustedKeyRecord = {
    keyId,
    publicKey: normalized,
    state: "trusted",
    ...(label ? { label } : {}),
    createdAt: timestamp,
    updatedAt: timestamp
  };
  policy.keys.push(record);
  return record;
}

export function revokeKey(policy: TrustPolicyDocument, keyId: string, reason?: string): TrustedKeyRecord {
  validateTrustPolicy(policy);
  const record = policy.keys.find((key) => key.keyId === keyId);
  if (!record) throw new Error(`Unknown key ID: ${keyId}`);
  record.state = "revoked";
  record.updatedAt = now();
  if (reason) record.reason = reason;
  return record;
}

export type ProofTrustState = "trusted" | "revoked" | "unknown" | "not-present";

export function evaluateProofTrust(policy: TrustPolicyDocument | null, signature?: { keyId?: string; publicKey?: string }): ProofTrustState {
  if (!signature) return "not-present";
  if (!policy) return "unknown";
  validateTrustPolicy(policy);
  const record = policy.keys.find((key) => key.keyId === signature.keyId);
  if (!record) return "unknown";
  if (record.publicKey !== normalizePublicKey(String(signature.publicKey ?? ""))) return "unknown";
  return record.state;
}
