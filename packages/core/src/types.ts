export type WorkStatus =
  | "planned" | "running" | "waiting_verification" | "verified"
  | "partial" | "waiting_lease" | "failed" | "unresolved" | "unverifiable" | "cancelled";

export type EffectStatus =
  | "planned" | "dispatched" | "acknowledged" | "unknown"
  | "observed" | "verified" | "reconciled" | "compensated" | "unresolved";

export type RiskClass = "read" | "local_write" | "external_write" | "destructive" | "financial";

export interface EvidenceRef {
  id: string;
  kind: string;
  uri?: string;
  digest?: string;
  observedAt?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface VerificationCheck {
  id: string;
  criterion: string;
  passed: boolean;
  details?: string;
  evidence: EvidenceRef[];
}

export interface VerificationResult {
  status: "verified" | "partial" | "failed" | "unverifiable";
  checks: VerificationCheck[];
  verifiedAt: string;
}

export interface SuccessCriterion {
  id: string;
  description: string;
  verifier: string;
  required: boolean;
}

export interface WorkContract {
  objective: string;
  inputs?: Record<string, unknown>;
  constraints?: Record<string, unknown>;
  success: SuccessCriterion[];
  deliverables: string[];
  riskClass: RiskClass;
  approvalRequired?: boolean;
}

export interface WorkEvent {
  id: string;
  type: string;
  at: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface EffectAttempt {
  attempt: number;
  capability: string;
  status: EffectStatus | "accepted" | "rejected" | "ambiguous";
  startedAt: string;
  finishedAt?: string;
  receipt?: CapabilityReceipt;
}

export interface EffectRecord {
  effectId: string;
  idempotencyKey: string;
  operation?: string;
  capability: string;
  status: EffectStatus;
  riskClass: RiskClass;
  receipt?: Record<string, unknown>;
  lastObservedState?: Record<string, unknown>;
  attempts: number;
  attemptLog: EffectAttempt[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkObject {
  id: string;
  contract: WorkContract;
  status: WorkStatus;
  events: WorkEvent[];
  effects: EffectRecord[];
  artifacts: EvidenceRef[];
  verification?: VerificationResult;
  createdAt: string;
  updatedAt: string;
}

export interface CapabilityRequest {
  operation: string;
  input: unknown;
  idempotencyKey?: string;
}

export interface CapabilityReceipt {
  status: "accepted" | "rejected" | "ambiguous";
  data?: unknown;
  externalEffectId?: string;
  evidence?: EvidenceRef[];
}

export interface CapabilityContext {
  work: WorkObject;
  effect?: EffectRecord;
  log: (type: string, message: string, data?: Record<string, unknown>) => void;
}

export interface Capability {
  name: string;
  version: string;
  operations: string[];
  riskClass: RiskClass;
  execute(request: CapabilityRequest, ctx: CapabilityContext): Promise<CapabilityReceipt>;
}

export interface VerifierContext {
  work: WorkObject;
  criterion: SuccessCriterion;
  artifacts: EvidenceRef[];
}

export interface Verifier {
  name: string;
  verify(ctx: VerifierContext): Promise<VerificationCheck>;
}
