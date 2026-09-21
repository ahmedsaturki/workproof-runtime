const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { digestProofBundle, verifyProofIntegrity } = require("./integrity");

export interface VaultRecord {
  version: "0.1";
  workId: string;
  digest: string;
  proofPath: string;
  artifacts: Record<string, string>;
  signerKeyId?: string;
  createdAt: string;
  publishedAt: string;
}

export interface VaultIndex {
  version: "0.1";
  records: VaultRecord[];
}

function now(): string {
  return new Date().toISOString();
}

function randomSuffix(): string {
  return crypto.randomBytes(8).toString("hex");
}

function atomicWrite(filePath: string, content: string): void {
  const temporary = `${filePath}.tmp-${randomSuffix()}`;
  fs.writeFileSync(temporary, content, "utf8");
  fs.renameSync(temporary, filePath);
}

function ensureVault(vaultDir: string): void {
  fs.mkdirSync(path.join(vaultDir, "proofs"), { recursive: true });
  fs.mkdirSync(path.join(vaultDir, "artifacts"), { recursive: true });
}

function indexPath(vaultDir: string): string {
  return path.join(vaultDir, "index.json");
}

function createIndex(): VaultIndex {
  return { version: "0.1", records: [] };
}

function loadIndex(vaultDir: string): VaultIndex {
  const file = indexPath(vaultDir);
  if (!fs.existsSync(file)) return createIndex();
  const index = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!index || index.version !== "0.1" || !Array.isArray(index.records)) {
    throw new Error("Invalid proof vault index");
  }

  const seen = new Set<string>();
  for (const record of index.records) {
    if (
      !record ||
      record.version !== "0.1" ||
      typeof record.workId !== "string" ||
      !/^[0-9a-f]{64}$/.test(record.digest) ||
      typeof record.proofPath !== "string" ||
      !record.proofPath.endsWith(`${record.digest}.json`) ||
      !record.artifacts ||
      typeof record.artifacts !== "object" ||
      typeof record.createdAt !== "string" ||
      typeof record.publishedAt !== "string"
    ) {
      throw new Error("Invalid proof vault record");
    }
    if (seen.has(record.digest)) throw new Error(`Duplicate proof vault digest: ${record.digest}`);
    seen.add(record.digest);

    for (const [uri, artifactPath] of Object.entries(record.artifacts as Record<string, unknown>)) {
      if (typeof uri !== "string" || typeof artifactPath !== "string" || !/^[0-9a-f]{64}$/.test(path.basename(artifactPath))) {
        throw new Error("Invalid proof vault artifact reference");
      }
    }
  }

  return index;
}

function saveIndex(vaultDir: string, index: VaultIndex): void {
  atomicWrite(indexPath(vaultDir), JSON.stringify(index, null, 2) + "\n");
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

export function sha256File(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function localArtifactPath(uri: string): string | null {
  if (!uri) return null;
  const candidate = uri.startsWith("file://") ? uri.slice("file://".length) : uri;
  try {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  } catch {
    return null;
  }
  return null;
}

function copyFileAtomic(source: string, destination: string): void {
  const temporary = `${destination}.tmp-${randomSuffix()}`;
  fs.copyFileSync(source, temporary);
  fs.renameSync(temporary, destination);
}

export function publishProof(proofFile: string, vaultDir: string): VaultRecord {
  ensureVault(vaultDir);
  const data = JSON.parse(fs.readFileSync(proofFile, "utf8"));
  if (!data?.integrity || !verifyProofIntegrity(proofBundleFromFile(data), data.integrity)) {
    throw new Error("Proof integrity must verify before vault publication");
  }

  const digest = digestProofBundle(proofBundleFromFile(data));
  if (data.integrity.digest !== digest) throw new Error("Proof integrity digest mismatch");
  const workId = data.work?.id;
  if (typeof workId !== "string" || !workId) throw new Error("Proof work ID is required");

  const destinationProof = path.join(vaultDir, "proofs", `${digest}.json`);
  if (!fs.existsSync(destinationProof)) {
    atomicWrite(destinationProof, JSON.stringify(data, null, 2) + "\n");
  } else {
    const existing = JSON.parse(fs.readFileSync(destinationProof, "utf8"));
    if (!existing?.integrity || !verifyProofIntegrity(proofBundleFromFile(existing), existing.integrity)) {
      throw new Error("Existing vault proof failed integrity verification");
    }
    if (existing.integrity.digest !== digest) throw new Error("Existing vault proof digest mismatch");
  }

  const artifacts: Record<string, string> = {};
  for (const artifact of Array.isArray(data.artifacts) ? data.artifacts : []) {
    const uri = typeof artifact?.uri === "string" ? artifact.uri : "";
    const source = localArtifactPath(uri);
    if (!source) continue;
    const artifactDigest = sha256File(source);
    const destinationArtifact = path.join(vaultDir, "artifacts", artifactDigest);
    if (!fs.existsSync(destinationArtifact)) {
      copyFileAtomic(source, destinationArtifact);
    } else if (sha256File(destinationArtifact) !== artifactDigest) {
      throw new Error("Existing vault artifact failed integrity verification");
    }
    artifacts[uri] = destinationArtifact;
  }

  const index = loadIndex(vaultDir);
  const existing = index.records.find((record) => record.digest === digest);
  if (existing) {
    return existing;
  }

  const createdAt = data.work?.createdAt ?? now();
  const record: VaultRecord = {
    version: "0.1",
    workId,
    digest,
    proofPath: destinationProof,
    artifacts,
    ...(data.signature?.keyId ? { signerKeyId: data.signature.keyId } : {}),
    createdAt,
    publishedAt: now()
  };
  index.records.push(record);
  index.records.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  saveIndex(vaultDir, index);
  return record;
}

export function listProofs(vaultDir: string): VaultRecord[] {
  return loadIndex(vaultDir).records.slice().sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function restoreProof(vaultDir: string, digest: string, outputPath: string): VaultRecord {
  const index = loadIndex(vaultDir);
  const record = index.records.find((item) => item.digest === digest);
  if (!record) throw new Error(`Unknown proof digest: ${digest}`);
  if (!fs.existsSync(record.proofPath)) throw new Error("Vault proof file is missing");

  const data = JSON.parse(fs.readFileSync(record.proofPath, "utf8"));
  if (!data?.integrity || !verifyProofIntegrity(proofBundleFromFile(data), data.integrity)) {
    throw new Error("Vault proof failed integrity verification");
  }
  if (data.integrity.digest !== digest) throw new Error("Vault proof digest mismatch");

  const proofArtifactUris = new Set(
    Array.isArray(data.artifacts)
      ? data.artifacts.map((artifact: any) => artifact?.uri).filter((uri: unknown): uri is string => typeof uri === "string")
      : []
  );
  for (const [uri, artifactPath] of Object.entries(record.artifacts)) {
    if (!proofArtifactUris.has(uri)) throw new Error("Vault artifact reference is absent from proof");
    if (!fs.existsSync(artifactPath)) throw new Error("Vault artifact file is missing");
    const expectedDigest = path.basename(artifactPath);
    if (!/^[0-9a-f]{64}$/.test(expectedDigest) || sha256File(artifactPath) !== expectedDigest) {
      throw new Error("Vault artifact failed integrity verification");
    }
  }
  ensureVault(vaultDir);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  atomicWrite(outputPath, JSON.stringify(data, null, 2) + "\n");
  return record;
}

export function inspectProof(vaultDir: string, digest: string): Record<string, unknown> {
  const record = loadIndex(vaultDir).records.find((item) => item.digest === digest);
  if (!record) throw new Error(`Unknown proof digest: ${digest}`);
  return { ...record };
}
