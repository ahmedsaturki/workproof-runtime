import { CapabilityRegistry } from "../../capabilities/src/registry";
import { Capability, EvidenceRef, Verifier } from "../../core/src/types";
const fs = require("fs");

export interface ResearchRecord { name: string; website: string; phone: string; source: string; }

class LocalResearchCapability implements Capability {
  name = "pack.research.local";
  version = "0.1.0";
  operations = ["research_suppliers"];
  riskClass = "read" as const;
  async execute(request: any) {
    const input = request.input as { dataPath: string; minRecords: number; outputPath: string };
    const records = JSON.parse(fs.readFileSync(input.dataPath, "utf8")) as ResearchRecord[];
    const unique = [...new Map(records.map(r => [r.website.toLowerCase(), r])).values()].filter(r => r.website && r.name);
    if (unique.length < input.minRecords) return { status: "rejected" as const, data: { count: unique.length } };
    fs.writeFileSync(input.outputPath, JSON.stringify(unique, null, 2), "utf8");
    return { status: "accepted" as const, data: { count: unique.length }, externalEffectId: `artifact:${input.outputPath}` };
  }
}

class ResearchArtifactVerifier implements Verifier {
  name = "pack.research.artifact";
  async verify(ctx: any) {
    const output = String(ctx.work.contract.inputs?.outputPath ?? "");
    const minRecords = Number(ctx.work.contract.inputs?.minRecords ?? 0);
    if (!fs.existsSync(output)) return { id: ctx.criterion.id, criterion: ctx.criterion.description, passed: false, details: "Output missing", evidence: [] };
    const records = JSON.parse(fs.readFileSync(output, "utf8")) as ResearchRecord[];
    const evidence: EvidenceRef[] = [{ id: `artifact:${output}`, kind: "file", uri: output }];
    const fieldsOk = records.every(r => r.name && r.website && r.source);
    const unique = new Set(records.map(r => r.website.toLowerCase())).size === records.length;
    const passed = records.length >= minRecords && fieldsOk && unique;
    return { id: ctx.criterion.id, criterion: ctx.criterion.description, passed, details: `${records.length} records; fields=${fieldsOk}; unique=${unique}`, evidence };
  }
}

export function registerResearchPack(registry: CapabilityRegistry, verification: { register(v: Verifier): void }): void {
  registry.register(new LocalResearchCapability());
  verification.register(new ResearchArtifactVerifier());
}
