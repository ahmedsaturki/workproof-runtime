import { canonicalJson, sha256 } from "./integrity";
import { ProofSignature, verifyProofSignature, signProof } from "./signature";
import { TrustPolicyDocument, validateTrustPolicy } from "./trust";

export interface TrustPolicySnapshot {
  version: "0.1";
  epoch: number;
  policy: TrustPolicyDocument;
  digest: string;
  signature?: ProofSignature;
}

export type TrustSnapshotDecision = "accept" | "noop" | "conflict" | "rollback-required" | "untrusted-signer" | "invalid";

function payload(snapshot: TrustPolicySnapshot): Record<string, unknown> {
  const { signature: _signature, digest: _digest, ...value } = snapshot;
  return value;
}

export function digestTrustPolicySnapshot(snapshot: TrustPolicySnapshot): string {
  return sha256(canonicalJson(payload(snapshot)));
}

export function buildTrustPolicySnapshot(policy: TrustPolicyDocument, epoch: number): TrustPolicySnapshot {
  validateTrustPolicy(policy);
  if (!Number.isSafeInteger(epoch) || epoch < 0) throw new Error("Trust snapshot epoch must be a non-negative safe integer");
  const base: TrustPolicySnapshot = { version: "0.1", epoch, policy, digest: "" };
  return { ...base, digest: digestTrustPolicySnapshot(base) };
}

function signingEnvelope(snapshot: TrustPolicySnapshot): Record<string, unknown> {
  return {
    version: snapshot.version,
    work: { id: `trust-policy:${snapshot.epoch}`, objective: "trust policy snapshot", status: "verified", createdAt: "snapshot", updatedAt: "snapshot" },
    effects: [],
    artifacts: [{ uri: `trust-policy://${snapshot.digest}` }],
    verification: { status: "verified", checks: [], verifiedAt: "snapshot" },
    events: [],
    trustSnapshot: { epoch: snapshot.epoch, policy: snapshot.policy, digest: snapshot.digest }
  };
}

export function signTrustPolicySnapshot(snapshot: TrustPolicySnapshot, privateKeyPem: string): TrustPolicySnapshot {
  const expectedDigest = digestTrustPolicySnapshot(snapshot);
  if (snapshot.digest !== expectedDigest) throw new Error("Trust snapshot digest mismatch");
  return { ...snapshot, signature: signProof(signingEnvelope(snapshot), privateKeyPem) };
}

export function verifyTrustPolicySnapshotSignature(snapshot: TrustPolicySnapshot): boolean {
  try {
    if (!snapshot || snapshot.version !== "0.1" || !Number.isSafeInteger(snapshot.epoch) || snapshot.epoch < 0) return false;
    validateTrustPolicy(snapshot.policy);
    if (!/^[0-9a-f]{64}$/.test(snapshot.digest) || snapshot.digest !== digestTrustPolicySnapshot(snapshot)) return false;
    return Boolean(snapshot.signature) && verifyProofSignature(signingEnvelope(snapshot), snapshot.signature);
  } catch {
    return false;
  }
}

export function verifyTrustPolicySnapshot(snapshot: TrustPolicySnapshot, trustedAdminKeyIds: Set<string>): TrustSnapshotDecision {
  if (!verifyTrustPolicySnapshotSignature(snapshot)) return "invalid";
  return trustedAdminKeyIds.has(snapshot.signature!.keyId) ? "accept" : "untrusted-signer";
}

export function reconcileTrustPolicySnapshot(current: TrustPolicySnapshot, incoming: TrustPolicySnapshot, trustedAdminKeyIds: Set<string>, allowRollback = false): TrustSnapshotDecision {
  const signatureDecision = verifyTrustPolicySnapshot(incoming, trustedAdminKeyIds);
  if (signatureDecision !== "accept") return signatureDecision;
  if (incoming.epoch > current.epoch) return "accept";
  if (incoming.epoch === current.epoch && incoming.digest === current.digest) return "noop";
  if (incoming.epoch === current.epoch) return "conflict";
  return allowRollback ? "accept" : "rollback-required";
}

export function applyTrustPolicySnapshot(current: TrustPolicySnapshot, incoming: TrustPolicySnapshot, trustedAdminKeyIds: Set<string>, allowRollback = false): TrustPolicySnapshot {
  const decision = reconcileTrustPolicySnapshot(current, incoming, trustedAdminKeyIds, allowRollback);
  if (decision === "accept") return { ...incoming };
  if (decision === "noop") return { ...current };
  throw new Error(`Trust snapshot ${decision}`);
}
