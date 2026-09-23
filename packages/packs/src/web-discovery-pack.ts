import { CapabilityRegistry } from "../../capabilities/src/registry";
import { Capability, EvidenceRef, Verifier } from "../../core/src/types";
const fs = require("fs");

export interface DiscoveryInput {
  searchUrl: string;
  query: string;
  minRecords: number;
  outputPath: string;
}

export interface DiscoveryRecord {
  name: string;
  website: string;
  source: string;
}

function normalizeDiscoveryRecord(value: unknown): DiscoveryRecord | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.name !== "string" || typeof row.website !== "string" || typeof row.source !== "string") return null;
  const name = row.name.trim();
  const website = row.website.trim();
  const source = row.source.trim();
  if (!name || !website || !source || name.length > 500 || website.length > 4096 || source.length > 500) return null;
  try {
    const parsed = new URL(website);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  } catch {
    return null;
  }
  return { name, website, source };
}

function uniqueDiscoveryRecords(values: unknown[]): DiscoveryRecord[] {
  const seen = new Set<string>();
  const unique: DiscoveryRecord[] = [];
  for (const value of values) {
    const record = normalizeDiscoveryRecord(value);
    if (!record) continue;
    const key = record.website.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(record);
  }
  return unique;
}

function atomicWriteJson(filePath: string, value: unknown): void {
  const path = require("path");
  const crypto = require("crypto");
  const temporary = filePath + ".tmp-" + crypto.randomBytes(8).toString("hex");
  try {
    fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
    fs.renameSync(temporary, filePath);
  } catch (error) {
    try { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); } catch {}
    throw error;
  }
}

class HttpDiscoveryCapability implements Capability {
  name = "pack.discovery.http";
  version = "0.1.0";
  operations = ["discover_records"];
  riskClass = "read" as const;

  async execute(request: any) {
    const input = request.input as DiscoveryInput;
    const url = `${input.searchUrl}?q=${encodeURIComponent(input.query)}`;
    const response = await fetch(url);
    if (!response.ok) return { status: "rejected" as const, data: { status: response.status } };
    const payload = await response.json() as { results?: unknown[] };
    const unique = uniqueDiscoveryRecords(Array.isArray(payload.results) ? payload.results : []);
    if (unique.length < input.minRecords) return { status: "rejected" as const, data: { count: unique.length } };
    atomicWriteJson(input.outputPath, unique);
    return {
      status: "accepted" as const,
      data: { count: unique.length, source: url },
      externalEffectId: `artifact:${input.outputPath}`,
      evidence: [{ id: `search:${url}`, kind: "http-source", uri: url }] as EvidenceRef[]
    };
  }
}

class DiscoveryVerifier implements Verifier {
  name = "pack.discovery.http";
  async verify(ctx: any) {
    const input = ctx.work.contract.inputs as DiscoveryInput;
    if (!fs.existsSync(input.outputPath)) return { id: ctx.criterion.id, criterion: ctx.criterion.description, passed: false, details: "Output missing", evidence: [] };
    const rows = JSON.parse(fs.readFileSync(input.outputPath, "utf8")) as DiscoveryRecord[];
    const unique = new Set(rows.map(r => r.website.toLowerCase()));
    const passed = rows.length >= input.minRecords && unique.size === rows.length && rows.every(r => r.name && r.website && r.source);
    return {
      id: ctx.criterion.id,
      criterion: ctx.criterion.description,
      passed,
      details: `${rows.length} records; unique=${unique.size === rows.length}`,
      evidence: passed ? [{ id: `artifact:${input.outputPath}`, kind: "file", uri: input.outputPath }] : []
    };
  }
}

export function registerWebDiscoveryPack(registry: CapabilityRegistry, verification: { register(v: Verifier): void }): void {
  registry.register(new HttpDiscoveryCapability());
  verification.register(new DiscoveryVerifier());
}
