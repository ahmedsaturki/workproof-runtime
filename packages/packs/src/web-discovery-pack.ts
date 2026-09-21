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
    const payload = await response.json() as { results: DiscoveryRecord[] };
    const seen = new Set<string>();
    const unique = payload.results.filter(r => r.name && r.website && r.source).filter(r => {
      const key = r.website.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (unique.length < input.minRecords) return { status: "rejected" as const, data: { count: unique.length } };
    fs.writeFileSync(input.outputPath, JSON.stringify(unique, null, 2), "utf8");
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
