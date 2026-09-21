import { RiskClass, WorkObject } from "../../core/src/types";

const rank: Record<RiskClass, number> = {
  read: 0,
  local_write: 1,
  external_write: 2,
  destructive: 3,
  financial: 4
};

export interface Policy {
  maxRisk: RiskClass;
  approvalRequiredAbove?: RiskClass;
  approved?: boolean;
}

export function canExecute(policy: Policy, work: WorkObject, risk: RiskClass): { allowed: boolean; reason: string } {
  if (rank[risk] > rank[policy.maxRisk]) return { allowed: false, reason: `Risk ${risk} exceeds policy max ${policy.maxRisk}` };
  if (policy.approvalRequiredAbove && rank[risk] >= rank[policy.approvalRequiredAbove] && !policy.approved) {
    return { allowed: false, reason: "Human approval required" };
  }
  if (work.contract.approvalRequired && !policy.approved) return { allowed: false, reason: "Work contract requires approval" };
  return { allowed: true, reason: "Allowed" };
}
