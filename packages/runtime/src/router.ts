import { CapabilityRegistry } from "../../capabilities/src/registry";
import { Capability, RiskClass } from "../../core/src/types";

const rank: Record<RiskClass, number> = { read: 0, local_write: 1, external_write: 2, destructive: 3, financial: 4 };

export interface RouteRequest { operation: string; riskClass: RiskClass; preferred?: string[]; }

export function selectCapability(registry: CapabilityRegistry, request: RouteRequest): Capability {
  const candidates = registry.findFor(request.operation).filter(c => rank[c.riskClass] <= rank[request.riskClass]);
  if (!candidates.length) throw new Error(`No capability can satisfy operation=${request.operation} risk<=${request.riskClass}`);
  for (const name of request.preferred ?? []) {
    const match = candidates.find(c => c.name === name);
    if (match) return match;
  }
  return [...candidates].sort((a, b) => rank[a.riskClass] - rank[b.riskClass] || a.name.localeCompare(b.name))[0];
}
