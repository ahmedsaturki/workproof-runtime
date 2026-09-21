const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
import {
  TrustPolicySnapshot,
  digestTrustPolicySnapshot,
  reconcileTrustPolicySnapshot,
  verifyTrustPolicySnapshot
} from "../../evidence/src/trust-sync";

export interface TrustSnapshotRecord {
  version: "0.1";
  digest: string;
  epoch: number;
  signerKeyId: string;
  path: string;
  publishedAt: string;
}

export interface TrustSnapshotIndex {
  version: "0.1";
  records: TrustSnapshotRecord[];
}

function now(): string { return new Date().toISOString(); }
function snapshotRoot(registryDir: string): string { return path.join(registryDir, "trust-snapshots"); }
function snapshotFilePath(registryDir: string, digest: string): string { return path.join(snapshotRoot(registryDir), `${digest}.json`); }
function snapshotIndexPath(registryDir: string): string { return path.join(snapshotRoot(registryDir), "index.json"); }
function currentPath(registryDir: string): string { return path.join(snapshotRoot(registryDir), "current.json"); }
function auditPath(registryDir: string): string { return path.join(snapshotRoot(registryDir), "events.jsonl"); }
function isDigest(value: string): boolean { return /^[0-9a-f]{64}$/.test(value); }

function canonicalSnapshot(snapshot: TrustPolicySnapshot): string {
  return JSON.stringify(snapshot, null, 2) + "\n";
}

function validateSnapshot(snapshot: TrustPolicySnapshot, trustedAdminKeyIds: Set<string>): void {
  const decision = verifyTrustPolicySnapshot(snapshot, trustedAdminKeyIds);
  if (decision !== "accept") throw new Error(`Invalid trust snapshot: ${decision}`);
  if (snapshot.digest !== digestTrustPolicySnapshot(snapshot)) throw new Error("Trust snapshot digest mismatch");
}

function ensureRoot(registryDir: string): void {
  fs.mkdirSync(snapshotRoot(registryDir), { recursive: true });
  if (!fs.existsSync(snapshotIndexPath(registryDir))) {
    fs.writeFileSync(snapshotIndexPath(registryDir), JSON.stringify({ version: "0.1", records: [] }, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
  }
  if (!fs.existsSync(auditPath(registryDir))) fs.writeFileSync(auditPath(registryDir), "", { encoding: "utf8", mode: 0o600 });
  fs.chmodSync(auditPath(registryDir), 0o600);
}

function loadIndex(registryDir: string): TrustSnapshotIndex {
  ensureRoot(registryDir);
  const value = JSON.parse(fs.readFileSync(snapshotIndexPath(registryDir), "utf8"));
  if (!value || value.version !== "0.1" || !Array.isArray(value.records)) throw new Error("Invalid trust snapshot index");
  const seen = new Set<string>();
  for (const record of value.records) {
    if (!record || record.version !== "0.1" || !isDigest(record.digest) || !Number.isSafeInteger(record.epoch) || record.epoch < 0 || typeof record.signerKeyId !== "string" || record.path !== `${record.digest}.json`) {
      throw new Error("Invalid trust snapshot record");
    }
    if (seen.has(record.digest)) throw new Error(`Duplicate trust snapshot digest: ${record.digest}`);
    seen.add(record.digest);
  }
  return value;
}

function saveIndex(registryDir: string, index: TrustSnapshotIndex): void {
  const temp = `${snapshotIndexPath(registryDir)}.tmp-${crypto.randomBytes(8).toString("hex")}`;
  fs.writeFileSync(temp, JSON.stringify(index, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
  fs.renameSync(temp, snapshotIndexPath(registryDir));
}

function recordAudit(registryDir: string, entry: Record<string, unknown>): void {
  fs.appendFileSync(auditPath(registryDir), JSON.stringify(entry) + "\n", "utf8");
}

export function publishTrustSnapshot(registryDir: string, snapshot: TrustPolicySnapshot, trustedAdminKeyIds: Set<string>): TrustSnapshotRecord {
  ensureRoot(registryDir);
  validateSnapshot(snapshot, trustedAdminKeyIds);
  const destination = snapshotFilePath(registryDir, snapshot.digest);
  if (!fs.existsSync(destination)) fs.writeFileSync(destination, canonicalSnapshot(snapshot), { encoding: "utf8", mode: 0o600 });
  else {
    const existing = JSON.parse(fs.readFileSync(destination, "utf8")) as TrustPolicySnapshot;
    validateSnapshot(existing, trustedAdminKeyIds);
    if (existing.digest !== snapshot.digest) throw new Error("Stored trust snapshot digest mismatch");
  }
  const index = loadIndex(registryDir);
  const existing = index.records.find((item) => item.digest === snapshot.digest);
  if (existing) return existing;
  const record: TrustSnapshotRecord = { version: "0.1", digest: snapshot.digest, epoch: snapshot.epoch, signerKeyId: snapshot.signature!.keyId, path: `${snapshot.digest}.json`, publishedAt: now() };
  index.records.push(record);
  index.records.sort((x, y) => y.publishedAt.localeCompare(x.publishedAt));
  saveIndex(registryDir, index);
  recordAudit(registryDir, { version: "0.1", event: "snapshot.published", at: record.publishedAt, digest: record.digest, epoch: record.epoch, signerKeyId: record.signerKeyId });
  return record;
}

export function getTrustSnapshot(registryDir: string, digest: string, trustedAdminKeyIds: Set<string>): TrustPolicySnapshot {
  if (!isDigest(digest)) throw new Error("Trust snapshot digest must be a lowercase SHA-256 value");
  const record = loadIndex(registryDir).records.find((item) => item.digest === digest);
  const snapshotPath = snapshotFilePath(registryDir, digest);
  if (!record || !fs.existsSync(snapshotPath)) throw new Error(`Unknown trust snapshot digest: ${digest}`);
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8")) as TrustPolicySnapshot;
  validateSnapshot(snapshot, trustedAdminKeyIds);
  if (snapshot.digest !== digest) throw new Error("Trust snapshot digest mismatch");
  return snapshot;
}

export function listTrustSnapshots(registryDir: string): TrustSnapshotRecord[] {
  return loadIndex(registryDir).records.slice();
}

export function getCurrentTrustSnapshot(registryDir: string, trustedAdminKeyIds: Set<string>): TrustPolicySnapshot | null {
  ensureRoot(registryDir);
  if (!fs.existsSync(currentPath(registryDir))) return null;
  const snapshot = JSON.parse(fs.readFileSync(currentPath(registryDir), "utf8")) as TrustPolicySnapshot;
  validateSnapshot(snapshot, trustedAdminKeyIds);
  return snapshot;
}

export function applyTrustSnapshot(registryDir: string, incoming: TrustPolicySnapshot, trustedAdminKeyIds: Set<string>, allowRollback = false): { decision: string; current: TrustPolicySnapshot } {
  ensureRoot(registryDir);
  validateSnapshot(incoming, trustedAdminKeyIds);
  const current = getCurrentTrustSnapshot(registryDir, trustedAdminKeyIds);
  if (!current) {
    fs.writeFileSync(currentPath(registryDir), canonicalSnapshot(incoming), { encoding: "utf8", mode: 0o600 });
    recordAudit(registryDir, { version: "0.1", event: "snapshot.accepted", at: now(), digest: incoming.digest, epoch: incoming.epoch, reason: "initial" });
    return { decision: "accept", current: incoming };
  }
  const decision = reconcileTrustPolicySnapshot(current, incoming, trustedAdminKeyIds, allowRollback);
  if (decision !== "accept" && decision !== "noop") throw new Error(`Trust snapshot ${decision}`);
  if (decision === "accept" && incoming.digest !== current.digest) {
    fs.writeFileSync(currentPath(registryDir), canonicalSnapshot(incoming), { encoding: "utf8", mode: 0o600 });
    recordAudit(registryDir, { version: "0.1", event: "snapshot.applied", at: now(), digest: incoming.digest, epoch: incoming.epoch, previousDigest: current.digest, previousEpoch: current.epoch, rollback: incoming.epoch < current.epoch });
    return { decision, current: incoming };
  }
  recordAudit(registryDir, { version: "0.1", event: "snapshot.noop", at: now(), digest: current.digest, epoch: current.epoch });
  return { decision, current };
}
