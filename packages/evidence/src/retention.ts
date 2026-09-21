const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { loadVaultIndex, saveVaultIndex } = require("./vault");

export type RetentionClass = "ephemeral" | "standard" | "long" | "permanent";

export interface RetentionPolicy {
  version: "0.1";
  defaultClass: RetentionClass;
  classes: Record<RetentionClass, number | null>;
}

export interface RetentionEntry {
  version: "0.1";
  digest: string;
  kind: "proof" | "artifact" | "snapshot";
  retentionClass: RetentionClass;
  namespace?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RetentionPin {
  version: "0.1";
  digest: string;
  kind: "proof" | "artifact" | "snapshot";
  namespace?: string;
  reason?: string;
  pinnedAt: string;
  expiresAt?: string;
}

export interface RetentionIndex {
  version: "0.1";
  policy: RetentionPolicy;
  entries: RetentionEntry[];
  pins: RetentionPin[];
}

export interface InventoryObject {
  kind: "proof" | "artifact" | "snapshot";
  digest: string;
  filePath: string;
  bytes: number;
  managed: boolean;
  integrity: "verified" | "invalid" | "unverified";
  protected: boolean;
  reachable: boolean;
  namespace?: string;
}

export interface GarbageCandidate {
  kind: "proof" | "artifact";
  digest: string;
  filePath: string;
  reason: "expired" | "orphan";
  bytes: number;
}

export interface GarbageCollectionPlan {
  version: "0.1";
  generatedAt: string;
  namespace?: string;
  dryRun: true;
  inventory: InventoryObject[];
  protectedRoots: string[];
  reachable: string[];
  candidates: GarbageCandidate[];
  orphanCount: number;
  warnings: string[];
}

const DAY = 24 * 60 * 60 * 1000;

export const DEFAULT_RETENTION_POLICY: RetentionPolicy = {
  version: "0.1",
  defaultClass: "standard",
  classes: {
    ephemeral: 0,
    standard: 30 * DAY,
    long: 365 * DAY,
    permanent: null
  }
};

function now(): string { return new Date().toISOString(); }

function atomicWrite(filePath: string, content: string): void {
  const temp = filePath + ".tmp-" + crypto.randomBytes(8).toString("hex");
  fs.writeFileSync(temp, content, "utf8");
  fs.renameSync(temp, filePath);
}

function indexPath(vaultDir: string): string { return path.join(vaultDir, "retention.json"); }
function journalPath(vaultDir: string): string { return path.join(vaultDir, "gc-journal.json"); }
function auditPath(vaultDir: string): string { return path.join(vaultDir, "gc-events.jsonl"); }
function isDigest(value: string): boolean { return /^[0-9a-f]{64}$/.test(value); }

function ensureRetentionIndex(vaultDir: string): RetentionIndex {
  fs.mkdirSync(vaultDir, { recursive: true });
  const file = indexPath(vaultDir);
  if (!fs.existsSync(file)) {
    const initial: RetentionIndex = { version: "0.1", policy: DEFAULT_RETENTION_POLICY, entries: [], pins: [] };
    atomicWrite(file, JSON.stringify(initial, null, 2) + "\n");
  }
  const value = JSON.parse(fs.readFileSync(file, "utf8")) as RetentionIndex;
  if (!value || value.version !== "0.1" || !value.policy || value.policy.version !== "0.1" || !Array.isArray(value.entries) || !Array.isArray(value.pins)) {
    throw new Error("Invalid retention index");
  }
  const classes: RetentionClass[] = ["ephemeral", "standard", "long", "permanent"];
  if (!classes.includes(value.policy.defaultClass) || !value.policy.classes || classes.some((key) => {
    const duration = value.policy.classes[key];
    return duration !== null && (!Number.isFinite(duration) || duration < 0);
  })) throw new Error("Invalid retention policy");
  for (const entry of value.entries) {
    if (!entry || entry.version !== "0.1" || !isDigest(entry.digest) || !["proof", "artifact", "snapshot"].includes(entry.kind) || !classes.includes(entry.retentionClass) || typeof entry.createdAt !== "string" || typeof entry.updatedAt !== "string") throw new Error("Invalid retention entry");
  }
  for (const pin of value.pins) {
    if (!pin || pin.version !== "0.1" || !isDigest(pin.digest) || !["proof", "artifact", "snapshot"].includes(pin.kind) || typeof pin.pinnedAt !== "string" || (pin.expiresAt !== undefined && typeof pin.expiresAt !== "string")) throw new Error("Invalid retention pin");
  }
  return value;
}

function saveRetentionIndex(vaultDir: string, index: RetentionIndex): void {
  atomicWrite(indexPath(vaultDir), JSON.stringify(index, null, 2) + "\n");
}

function audit(vaultDir: string, event: Record<string, unknown>): void {
  fs.appendFileSync(auditPath(vaultDir), JSON.stringify(event) + "\n", "utf8");
}

function namespaceAllowed(objectNamespace: string | undefined, targetNamespace: string | undefined): boolean {
  if (!targetNamespace) return true;
  return objectNamespace === targetNamespace;
}

function retentionForDigest(index: RetentionIndex, digest: string, kind: "proof" | "artifact" | "snapshot"): RetentionEntry | undefined {
  return index.entries.find((entry) => entry.digest === digest && entry.kind === kind);
}

function activePin(index: RetentionIndex, digest: string, kind: "proof" | "artifact" | "snapshot", at: number): RetentionPin | undefined {
  return index.pins.find((pin) => {
    if (pin.digest !== digest || pin.kind !== kind) return false;
    if (!pin.expiresAt) return true;
    const time = Date.parse(pin.expiresAt);
    return Number.isFinite(time) && time > at;
  });
}

function expiry(entry: RetentionEntry | undefined, policy: RetentionPolicy, baseTime: string): number | null {
  const duration = policy.classes[entry?.retentionClass ?? policy.defaultClass];
  if (duration === null) return null;
  const base = Date.parse(baseTime);
  return Number.isFinite(base) ? base + duration : Date.now();
}

function walkFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const out: string[] = [];
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    const stat = fs.statSync(current);
    if (stat.isDirectory()) {
      for (const child of fs.readdirSync(current)) stack.push(path.join(current, child));
    } else if (stat.isFile()) out.push(current);
  }
  return out;
}

function proofIntegrity(filePath: string): "verified" | "invalid" {
  try {
    const { verifyProofIntegrity } = require("./integrity");
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const bundle = { version: data.version, work: data.work, effects: data.effects, artifacts: data.artifacts, verification: data.verification, events: data.events };
    return data.integrity && verifyProofIntegrity(bundle, data.integrity) ? "verified" : "invalid";
  } catch {
    return "invalid";
  }
}

function artifactIntegrity(filePath: string, expectedDigest: string): "verified" | "invalid" {
  try {
    const actual = crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
    return actual === expectedDigest ? "verified" : "invalid";
  } catch {
    return "invalid";
  }
}

export function loadRetentionPolicy(vaultDir: string): RetentionPolicy { return ensureRetentionIndex(vaultDir).policy; }

export function setRetentionClass(vaultDir: string, digest: string, kind: "proof" | "artifact" | "snapshot", retentionClass: RetentionClass, namespace?: string): RetentionEntry {
  if (!isDigest(digest)) throw new Error("Retention digest must be a lowercase SHA-256 value");
  const index = ensureRetentionIndex(vaultDir);
  const timestamp = now();
  const existing = retentionForDigest(index, digest, kind);
  const entry: RetentionEntry = { version: "0.1", digest, kind, retentionClass, ...(namespace ? { namespace } : {}), createdAt: existing?.createdAt ?? timestamp, updatedAt: timestamp };
  index.entries = index.entries.filter((item) => !(item.digest === digest && item.kind === kind));
  index.entries.push(entry);
  saveRetentionIndex(vaultDir, index);
  audit(vaultDir, { version: "0.1", event: "retention.updated", at: timestamp, digest, kind, retentionClass, namespace: namespace ?? null });
  return entry;
}

export function pinRetention(vaultDir: string, digest: string, kind: "proof" | "artifact" | "snapshot", reason?: string, namespace?: string, expiresAt?: string): RetentionPin {
  if (!isDigest(digest)) throw new Error("Retention pin digest must be a lowercase SHA-256 value");
  if (expiresAt !== undefined && !Number.isFinite(Date.parse(expiresAt))) throw new Error("Invalid pin expiration");
  const index = ensureRetentionIndex(vaultDir);
  const pin: RetentionPin = { version: "0.1", digest, kind, ...(namespace ? { namespace } : {}), ...(reason ? { reason } : {}), pinnedAt: now(), ...(expiresAt ? { expiresAt } : {}) };
  index.pins = index.pins.filter((item) => !(item.digest === digest && item.kind === kind));
  index.pins.push(pin);
  saveRetentionIndex(vaultDir, index);
  audit(vaultDir, { version: "0.1", event: "retention.pinned", at: pin.pinnedAt, digest, kind, namespace: namespace ?? null, reason: reason ?? null, expiresAt: expiresAt ?? null });
  return pin;
}

export function unpinRetention(vaultDir: string, digest: string, kind: "proof" | "artifact" | "snapshot"): boolean {
  const index = ensureRetentionIndex(vaultDir);
  const before = index.pins.length;
  index.pins = index.pins.filter((item) => !(item.digest === digest && item.kind === kind));
  saveRetentionIndex(vaultDir, index);
  if (index.pins.length !== before) audit(vaultDir, { version: "0.1", event: "retention.unpinned", at: now(), digest, kind });
  return index.pins.length !== before;
}

export function inventoryVault(vaultDir: string, registryDirs: string[] = []): InventoryObject[] {
  const index = loadVaultIndex(vaultDir);
  const retention = ensureRetentionIndex(vaultDir);
  const at = Date.now();
  const objects: InventoryObject[] = [];
  for (const filePath of walkFiles(path.join(vaultDir, "proofs")).filter((file) => file.endsWith(".json"))) {
    const digest = path.basename(filePath, ".json");
    if (!isDigest(digest)) continue;
    const record = index.records.find((item: any) => item.digest === digest);
    const entry = retentionForDigest(retention, digest, "proof");
    const pin = activePin(retention, digest, "proof", at);
    const keepUntil = expiry(entry, retention.policy, record?.publishedAt ?? now());
    const kept = Boolean(pin) || keepUntil === null || keepUntil > at;
    objects.push({ kind: "proof", digest, filePath, bytes: fs.statSync(filePath).size, managed: Boolean(record), integrity: proofIntegrity(filePath), protected: kept, reachable: kept, ...(entry?.namespace ? { namespace: entry.namespace } : {}) });
  }
  for (const filePath of walkFiles(path.join(vaultDir, "artifacts"))) {
    const digest = path.basename(filePath);
    if (!isDigest(digest)) continue;
    const entry = retentionForDigest(retention, digest, "artifact");
    const pin = activePin(retention, digest, "artifact", at);
    const keepUntil = expiry(entry, retention.policy, entry?.createdAt ?? now());
    const kept = Boolean(pin) || keepUntil === null || keepUntil > at;
    objects.push({ kind: "artifact", digest, filePath, bytes: fs.statSync(filePath).size, managed: true, integrity: artifactIntegrity(filePath, digest), protected: kept, reachable: kept, ...(entry?.namespace ? { namespace: entry.namespace } : {}) });
  }
  for (const registryDir of registryDirs) {
    const root = path.join(registryDir, "trust-snapshots");
    for (const filePath of walkFiles(root).filter((file) => file.endsWith(".json"))) {
      const base = path.basename(filePath);
      if (base === "current.json" || base === "index.json") continue;
      const digest = path.basename(filePath, ".json");
      if (!isDigest(digest)) continue;
      objects.push({ kind: "snapshot", digest, filePath, bytes: fs.statSync(filePath).size, managed: false, integrity: "unverified", protected: true, reachable: true });
    }
  }
  return objects;
}

export function planGarbageCollection(vaultDir: string, options: { namespace?: string; registryDirs?: string[] } = {}): GarbageCollectionPlan {
  const at = Date.now();
  const generatedAt = now();
  const retention = ensureRetentionIndex(vaultDir);
  const index = loadVaultIndex(vaultDir);
  const inventory = inventoryVault(vaultDir, options.registryDirs ?? []);
  const protectedRoots: string[] = [];
  const reachable = new Set<string>();
  const warnings: string[] = [];
  const recordByDigest = new Map(index.records.map((record: any) => [record.digest, record]));
  for (const object of inventory) {
    const entry = retentionForDigest(retention, object.digest, object.kind);
    const pin = activePin(retention, object.digest, object.kind, at);
    const namespace = entry?.namespace ?? pin?.namespace;
    if (object.kind === "snapshot") {
      protectedRoots.push("snapshot:" + object.digest);
      reachable.add("snapshot:" + object.digest);
      continue;
    }
    if (options.namespace && namespace !== options.namespace) {
      if (!entry && !pin) protectedRoots.push(object.kind + ":" + object.digest);
      continue;
    }
    if (object.protected || pin) {
      protectedRoots.push(object.kind + ":" + object.digest);
      reachable.add(object.kind + ":" + object.digest);
    }
  }
  for (const key of Array.from(reachable).filter((item) => item.startsWith("proof:"))) {
    const digest = key.slice(6);
    const record = recordByDigest.get(digest);
    if (!record) continue;
    for (const artifactPath of Object.values(record.artifacts ?? {})) {
      if (typeof artifactPath !== "string") continue;
      const artifactDigest = path.basename(artifactPath);
      if (isDigest(artifactDigest)) reachable.add("artifact:" + artifactDigest);
    }
  }
  const candidates: GarbageCandidate[] = [];
  for (const object of inventory) {
    if (object.kind === "snapshot" || reachable.has(object.kind + ":" + object.digest)) continue;
    const entry = retentionForDigest(retention, object.digest, object.kind);
    const pin = activePin(retention, object.digest, object.kind, at);
    const namespace = entry?.namespace ?? pin?.namespace;
    if (options.namespace && namespace !== options.namespace) continue;
    if (object.integrity !== "verified") {
      warnings.push(object.kind + " " + object.digest + " failed integrity verification and was not made deletable");
      continue;
    }
    candidates.push({ kind: object.kind as "proof" | "artifact", digest: object.digest, filePath: object.filePath, reason: entry || pin ? "expired" : "orphan", bytes: object.bytes });
  }
  return { version: "0.1", generatedAt, ...(options.namespace ? { namespace: options.namespace } : {}), dryRun: true, inventory, protectedRoots, reachable: Array.from(reachable).sort(), candidates, orphanCount: candidates.filter((item) => item.reason === "orphan").length, warnings };
}

export function executeGarbageCollection(vaultDir: string, options: { namespace?: string; registryDirs?: string[] } = {}): GarbageCollectionPlan & { executed: boolean; deleted: number; failed: number; journalPath: string } {
  const plan = planGarbageCollection(vaultDir, options);
  const journal = journalPath(vaultDir);
  atomicWrite(journal, JSON.stringify({ version: "0.1", phase: "planned", plan }, null, 2) + "\n");
  const index = loadVaultIndex(vaultDir);
  const proofDigests = new Set(plan.candidates.filter((item) => item.kind === "proof").map((item) => item.digest));
  if (proofDigests.size) {
    index.records = index.records.filter((record: any) => !proofDigests.has(record.digest));
    saveVaultIndex(vaultDir, index);
  }
  atomicWrite(journal, JSON.stringify({ version: "0.1", phase: "index-updated", plan }, null, 2) + "\n");
  let deleted = 0;
  let failed = 0;
  for (const candidate of plan.candidates) {
    try {
      if (!fs.existsSync(candidate.filePath)) continue;
      fs.unlinkSync(candidate.filePath);
      deleted += 1;
      audit(vaultDir, { version: "0.1", event: "gc.deleted", at: now(), kind: candidate.kind, digest: candidate.digest, reason: candidate.reason, bytes: candidate.bytes });
    } catch (error) {
      failed += 1;
      audit(vaultDir, { version: "0.1", event: "gc.delete_failed", at: now(), kind: candidate.kind, digest: candidate.digest, error: String(error) });
    }
  }
  atomicWrite(journal, JSON.stringify({ version: "0.1", phase: failed ? "partial" : "complete", completedAt: now(), plan, deleted, failed }, null, 2) + "\n");
  return { ...plan, executed: true, deleted, failed, journalPath: journal };
}

export function repairVaultIndex(vaultDir: string): { removedRecords: number; removedArtifactRefs: number; journalRecovered: boolean } {
  const journal = journalPath(vaultDir);
  const journalRecovered = fs.existsSync(journal);
  const index = loadVaultIndex(vaultDir);
  let removedRecords = 0;
  let removedArtifactRefs = 0;
  index.records = index.records.filter((record: any) => {
    if (!fs.existsSync(record.proofPath)) { removedRecords += 1; return false; }
    for (const [uri, artifactPath] of Object.entries(record.artifacts ?? {})) {
      if (!fs.existsSync(artifactPath as string)) { delete record.artifacts[uri]; removedArtifactRefs += 1; }
    }
    return true;
  });
  saveVaultIndex(vaultDir, index);
  if (journalRecovered) {
    fs.unlinkSync(journal);
    audit(vaultDir, { version: "0.1", event: "gc.journal_recovered", at: now() });
  }
  if (removedRecords || removedArtifactRefs) audit(vaultDir, { version: "0.1", event: "vault.repaired", at: now(), removedRecords, removedArtifactRefs });
  return { removedRecords, removedArtifactRefs, journalRecovered };
}
