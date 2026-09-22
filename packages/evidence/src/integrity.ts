const crypto = require("crypto");
import { WorkObject } from "../../core/src/types";
import { buildProofBundle } from "./bundle";

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.keys(record).sort().reduce<Record<string, unknown>>((out, key) => {
      out[key] = normalize(record[key]);
      return out;
    }, {});
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(normalize(value));
}

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

export function digestProofBundle(bundle: Record<string, unknown>): string {
  return sha256(canonicalJson(bundle));
}

export interface ProofIntegrityManifest {
  version: "0.1";
  algorithm: "sha256";
  workId: string;
  digest: string;
}

export function buildIntegrityManifest(work: WorkObject): ProofIntegrityManifest {
  const bundle = buildProofBundle(work);
  return {
    version: "0.1",
    algorithm: "sha256",
    workId: work.id,
    digest: digestProofBundle(bundle)
  };
}

export function verifyProofIntegrity(bundle: Record<string, unknown>, manifest: ProofIntegrityManifest): boolean {
  const workId = (bundle.work as Record<string, unknown> | undefined)?.id;
  return (
    manifest?.version === "0.1" &&
    manifest?.algorithm === "sha256" &&
    typeof manifest?.workId === "string" &&
    typeof manifest?.digest === "string" &&
    /^[0-9a-f]{64}$/.test(manifest.digest) &&
    manifest.workId === workId &&
    digestProofBundle(bundle) === manifest.digest
  );
}
