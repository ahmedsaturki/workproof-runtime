const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

import { digestProofBundle, verifyProofIntegrity } from "./integrity";
import { verifyProofSignature } from "./signature";

export interface PortableArtifactEntry {
  uri: string;
  path: string | null;
  sha256: string | null;
  size: number | null;
  portable: boolean;
}

export interface PortableProofManifest {
  version: "0.1";
  kind: "workproof.portable-proof";
  workId: string;
  proofDigest: string;
  proofFile: {
    path: "proof.json";
    sha256: string;
    size: number;
  };
  artifacts: PortableArtifactEntry[];
  exportedAt: string;
}

function now(): string {
  return new Date().toISOString();
}

function canonicalProofBundle(data: any): Record<string, unknown> {
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

function isInside(rootDir: string, targetPath: string): boolean {
  const root = path.resolve(rootDir) + path.sep;
  return path.resolve(targetPath).startsWith(root);
}

function assertInside(rootDir: string, targetPath: string, label: string): void {
  if (!isInside(rootDir, targetPath)) {
    throw new Error(label + " escapes portable proof bundle");
  }
}

function safeRelativePath(rootDir: string, relativePath: string, label: string): string {
  if (
    typeof relativePath !== "string" ||
    !relativePath.trim() ||
    path.isAbsolute(relativePath) ||
    relativePath.split(/[\\/]+/).includes("..")
  ) {
    throw new Error("Invalid " + label + " path");
  }
  const absolute = path.resolve(rootDir, relativePath);
  assertInside(rootDir, absolute, label);
  return absolute;
}

function assertDirectoryWithin(rootDir: string, directoryPath: string, label: string): void {
  if (!fs.existsSync(directoryPath)) throw new Error(label + " is missing");
  const stat = fs.lstatSync(directoryPath);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(label + " must be a regular directory");
  const realPath = fs.realpathSync(directoryPath);
  assertInside(rootDir, realPath, label);
}

function assertRegularFileWithin(rootDir: string, filePath: string, label: string): void {
  if (!fs.existsSync(filePath)) throw new Error(label + " is missing");
  const stat = fs.lstatSync(filePath);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(label + " must be a regular file");
  const realPath = fs.realpathSync(filePath);
  assertInside(rootDir, realPath, label);
}

function localArtifactPath(uri: string): string | null {
  if (typeof uri !== "string" || !uri) return null;
  let candidate = uri;
  if (uri.startsWith("file://")) {
    try {
      candidate = decodeURIComponent(uri.slice("file://".length));
      if (candidate.startsWith("/") && /^\/[A-Za-z]:[\\/]/.test(candidate)) {
        candidate = candidate.slice(1);
      }
    } catch {
      return null;
    }
  }
  try {
    const stat = fs.statSync(candidate);
    return stat.isFile() ? path.resolve(candidate) : null;
  } catch {
    return null;
  }
}

function sha256File(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function atomicWrite(filePath: string, content: string): void {
  const temporary = filePath + ".tmp-" + process.pid + "-" + crypto.randomBytes(8).toString("hex");
  try {
    fs.writeFileSync(temporary, content, { encoding: "utf8", flag: "wx" });
    fs.renameSync(temporary, filePath);
  } catch (error) {
    try { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); } catch {}
    throw error;
  }
}

function copyAtomic(source: string, destination: string): void {
  const temporary = destination + ".tmp-" + process.pid + "-" + crypto.randomBytes(8).toString("hex");
  try {
    fs.copyFileSync(source, temporary, fs.constants.COPYFILE_EXCL);
    fs.renameSync(temporary, destination);
  } catch (error) {
    try { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); } catch {}
    throw error;
  }
}

function requireIntegrityProof(data: any): { bundle: Record<string, unknown>; digest: string } {
  const bundle = canonicalProofBundle(data);
  if (!data?.integrity || !verifyProofIntegrity(bundle, data.integrity)) {
    throw new Error("Portable proof requires valid integrity metadata");
  }
  if (data.signature && !verifyProofSignature(data, data.signature)) {
    throw new Error("Portable proof contains an invalid signature");
  }
  return { bundle, digest: digestProofBundle(bundle) };
}

function ensureNewBundleDirectory(bundleDir: string): void {
  if (fs.existsSync(bundleDir)) {
    const stat = fs.lstatSync(bundleDir);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      throw new Error("Portable proof bundle directory must be a regular directory: " + bundleDir);
    }
    const entries = fs.readdirSync(bundleDir);
    if (entries.length) {
      throw new Error("Portable proof bundle directory is not empty: " + bundleDir);
    }
  } else {
    fs.mkdirSync(bundleDir, { recursive: true });
  }
}

function loadManifest(bundleDir: string): PortableProofManifest {
  const manifestPath = path.join(bundleDir, "manifest.json");
  assertRegularFileWithin(bundleDir, manifestPath, "Portable proof manifest");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  if (
    !manifest ||
    manifest.version !== "0.1" ||
    manifest.kind !== "workproof.portable-proof" ||
    typeof manifest.workId !== "string" ||
    !/^[0-9a-f]{64}$/.test(manifest.proofDigest) ||
    !manifest.proofFile ||
    manifest.proofFile.path !== "proof.json" ||
    !/^[0-9a-f]{64}$/.test(manifest.proofFile.sha256) ||
    !Number.isSafeInteger(manifest.proofFile.size) ||
    !Array.isArray(manifest.artifacts) ||
    typeof manifest.exportedAt !== "string"
  ) {
    throw new Error("Invalid portable proof manifest");
  }

  const seenUris = new Set<string>();
  for (const artifact of manifest.artifacts) {
    if (!artifact || typeof artifact.uri !== "string" || seenUris.has(artifact.uri)) {
      throw new Error("Invalid or duplicate portable artifact reference");
    }
    seenUris.add(artifact.uri);

    if (artifact.portable) {
      if (
        typeof artifact.path !== "string" ||
        !artifact.path.startsWith("artifacts/") ||
        !/^[0-9a-f]{64}$/.test(artifact.sha256 ?? "") ||
        !Number.isSafeInteger(artifact.size)
      ) {
        throw new Error("Invalid portable artifact entry");
      }
      safeRelativePath(bundleDir, artifact.path, "portable artifact");
    } else if (artifact.path !== null || artifact.sha256 !== null || artifact.size !== null) {
      throw new Error("Non-portable artifact must not carry local bundle metadata");
    }
  }

  return manifest as PortableProofManifest;
}

export function exportPortableProof(proofPath: string, bundleDir: string): PortableProofManifest {
  const data = JSON.parse(fs.readFileSync(proofPath, "utf8"));
  const proof = requireIntegrityProof(data);
  const workId = data.work?.id;

  if (typeof workId !== "string" || !workId) {
    throw new Error("Portable proof work ID is required");
  }

  ensureNewBundleDirectory(bundleDir);
  const artifactsDir = path.join(bundleDir, "artifacts");
  fs.mkdirSync(artifactsDir, { recursive: true });
  assertDirectoryWithin(bundleDir, artifactsDir, "Portable artifacts directory");

  const artifactEntries: PortableArtifactEntry[] = [];

  for (const artifact of Array.isArray(data.artifacts) ? data.artifacts : []) {
    const uri = typeof artifact?.uri === "string" ? artifact.uri : "";
    if (!uri) continue;

    const source = localArtifactPath(uri);
    if (!source) {
      artifactEntries.push({
        uri,
        path: null,
        sha256: null,
        size: null,
        portable: false
      });
      continue;
    }

    const fileDigest = sha256File(source);
    const destinationRelative = "artifacts/" + fileDigest;
    const destination = safeRelativePath(bundleDir, destinationRelative, "portable artifact");

    if (!fs.existsSync(destination)) {
      copyAtomic(source, destination);
    } else if (sha256File(destination) !== fileDigest) {
      throw new Error("Portable artifact digest collision: " + fileDigest);
    }

    artifactEntries.push({
      uri,
      path: destinationRelative,
      sha256: fileDigest,
      size: fs.statSync(source).size,
      portable: true
    });
  }

  const proofTarget = path.join(bundleDir, "proof.json");
  atomicWrite(proofTarget, JSON.stringify(data, null, 2) + "\n");

  const manifest: PortableProofManifest = {
    version: "0.1",
    kind: "workproof.portable-proof",
    workId,
    proofDigest: proof.digest,
    proofFile: {
      path: "proof.json",
      sha256: sha256File(proofTarget),
      size: fs.statSync(proofTarget).size
    },
    artifacts: artifactEntries,
    exportedAt: now()
  };

  atomicWrite(path.join(bundleDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}

export function verifyPortableProof(bundleDir: string): PortableProofManifest {
  const manifest = loadManifest(bundleDir);
  const proofPath = safeRelativePath(bundleDir, manifest.proofFile.path, "proof");

  if (!fs.existsSync(proofPath) || !fs.statSync(proofPath).isFile()) {
    throw new Error("Portable proof file is missing");
  }

  assertRegularFileWithin(bundleDir, proofPath, "Portable proof");
  const proofData = JSON.parse(fs.readFileSync(proofPath, "utf8"));
  const proof = requireIntegrityProof(proofData);

  if (
    sha256File(proofPath) !== manifest.proofFile.sha256 ||
    fs.statSync(proofPath).size !== manifest.proofFile.size
  ) {
    throw new Error("Portable proof file digest or size mismatch");
  }

  if (proof.digest !== manifest.proofDigest || proofData.integrity?.workId !== manifest.workId) {
    throw new Error("Portable proof digest or work ID mismatch");
  }

  const proofUris: Set<string> = new Set<string>(
    Array.isArray(proofData.artifacts)
      ? proofData.artifacts
        .map((artifact: any) => artifact?.uri)
        .filter((uri: unknown): uri is string => typeof uri === "string" && uri.length > 0)
      : []
  );
  const manifestUris = new Set(manifest.artifacts.map((artifact) => artifact.uri));
  if (proofUris.size !== manifestUris.size || [...proofUris].some((uri) => !manifestUris.has(uri))) {
    throw new Error("Portable proof artifact manifest does not match proof artifacts");
  }

  for (const uri of proofUris) {
    const manifestArtifact = manifest.artifacts.find((artifact) => artifact.uri === uri);
    if (!manifestArtifact) throw new Error("Portable artifact manifest entry is missing: " + uri);
    if (uri.startsWith("file://") && !manifestArtifact.portable) {
      throw new Error("Local file artifact must be portable: " + uri);
    }
  }

  for (const artifact of manifest.artifacts) {
    if (!artifact.portable) continue;

    const artifactPath = safeRelativePath(bundleDir, artifact.path as string, "portable artifact");
    assertRegularFileWithin(bundleDir, artifactPath, "Portable artifact");

    const stat = fs.statSync(artifactPath);
    if (stat.size !== artifact.size || sha256File(artifactPath) !== artifact.sha256) {
      throw new Error("Portable artifact digest mismatch: " + artifact.uri);
    }
  }

  return manifest;
}

export function importPortableProof(
  bundleDir: string,
  outputDir: string
): {
  manifest: PortableProofManifest;
  proofPath: string;
  artifactPaths: string[];
} {
  const manifest = verifyPortableProof(bundleDir);
  ensureNewBundleDirectory(outputDir);

  const outputArtifacts = path.join(outputDir, "artifacts");
  fs.mkdirSync(outputArtifacts, { recursive: true });
  assertDirectoryWithin(outputDir, outputArtifacts, "Imported artifacts directory");

  const sourceProof = safeRelativePath(bundleDir, "proof.json", "proof");
  const targetProof = safeRelativePath(outputDir, "proof.json", "imported proof");
  copyAtomic(sourceProof, targetProof);

  const sourceManifest = safeRelativePath(bundleDir, "manifest.json", "manifest");
  const targetManifest = safeRelativePath(outputDir, "manifest.json", "imported manifest");
  copyAtomic(sourceManifest, targetManifest);

  const artifactPaths: string[] = [];
  for (const artifact of manifest.artifacts) {
    if (!artifact.portable) continue;
    const source = safeRelativePath(bundleDir, artifact.path as string, "portable artifact");
    const target = safeRelativePath(outputDir, artifact.path as string, "imported artifact");

    if (!fs.existsSync(target)) {
      copyAtomic(source, target);
    } else if (sha256File(target) !== artifact.sha256) {
      throw new Error("Existing imported artifact digest mismatch: " + artifact.uri);
    }

    artifactPaths.push(target);
  }

  return { manifest, proofPath: targetProof, artifactPaths };
}
