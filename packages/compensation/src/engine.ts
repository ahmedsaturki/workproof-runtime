import { CapabilityRegistry } from "../../capabilities/src/registry";
import { EffectRecord, RiskClass, WorkObject } from "../../core/src/types";
import { WorkStore } from "../../core/src/work";
import { Policy, canExecute } from "../../policy/src/guard";
import { executeWithSafety } from "../../recovery/src/engine";

const rank: Record<RiskClass, number> = { read: 0, local_write: 1, external_write: 2, destructive: 3, financial: 4 };

export type CompensationExecutionStatus = "compensated" | "partial" | "unresolved" | "blocked";

export interface CompensationRequest {
  sagaId: string;
  sourceEffectId: string;
  operation: string;
  input: unknown;
  idempotencyKey: string;
  capability?: string;
  riskClass: RiskClass;
  maxAttempts?: number;
}

export interface CompensationResult {
  status: CompensationExecutionStatus;
  sagaId: string;
  compensationEffectId: string;
  sourceEffectId: string;
  attempts: number;
}

function sourceEffect(work: WorkObject, id: string): EffectRecord {
  const effect = work.effects.find(item => item.effectId === id);
  if (!effect) throw new Error("Unknown source effect: " + id);
  if (effect.kind === "compensation") throw new Error("A compensation effect cannot itself be compensated");
  if (!["acknowledged","observed","verified","reconciled"].includes(effect.status)) throw new Error("Source effect is not in a compensable state: " + effect.status);
  return effect;
}

export async function executeCompensation(args: {
  store: WorkStore;
  registry: CapabilityRegistry;
  work: WorkObject;
  request: CompensationRequest;
  verifyExternalState: (work: WorkObject, effect: EffectRecord) => Promise<boolean>;
  policy?: Policy;
  persist?: (work: WorkObject) => void;
  contextLog?: (type: string, message: string, data?: Record<string, unknown>) => void;
}): Promise<CompensationResult> {
  const { store, registry, work, request, verifyExternalState, policy, persist } = args;
  const log = args.contextLog ?? ((type, message, data) => store.event(work, type, message, data));
  const saga = work.sagas?.find(item => item.sagaId === request.sagaId);
  if (!saga) throw new Error("Unknown saga: " + request.sagaId);
  const source = sourceEffect(work, request.sourceEffectId);

  if (rank[request.riskClass] > rank[work.contract.riskClass]) throw new Error("Compensation risk " + request.riskClass + " exceeds work contract risk ceiling " + work.contract.riskClass);

  const effectivePolicy: Policy = policy ?? { maxRisk: work.contract.riskClass, approved: !work.contract.approvalRequired };
  const decision = canExecute(effectivePolicy, work, request.riskClass);

  const compensationCapability = request.capability
    ? registry.get(request.capability)
    : registry.findFor(request.operation).find(item => rank[item.riskClass] <= rank[request.riskClass]);

  if (!compensationCapability && decision.allowed) throw new Error("No compensation capability can satisfy operation=" + request.operation);

  const effect = store.addCompensationEffect(work, request.sagaId, source.effectId, compensationCapability?.name ?? "unresolved", request.riskClass, request.idempotencyKey, request.operation, request.input);

  if (!decision.allowed) {
    effect.status = "unresolved";
    store.updateSagaStatus(work, saga.sagaId);
    log("compensation.blocked", "Compensation blocked by policy", { sagaId: saga.sagaId, sourceEffectId: source.effectId, compensationEffectId: effect.effectId, reason: decision.reason });
    persist?.(work);
    return { status: "blocked", sagaId: saga.sagaId, compensationEffectId: effect.effectId, sourceEffectId: source.effectId, attempts: effect.attempts };
  }

  if (rank[compensationCapability!.riskClass] > rank[request.riskClass]) throw new Error("Compensation capability risk exceeds requested ceiling");

  if (effect.status === "verified" || effect.status === "compensated") {
    store.updateSagaStatus(work, saga.sagaId);
    persist?.(work);
    return { status: saga.status === "compensated" ? "compensated" : "partial", sagaId: saga.sagaId, compensationEffectId: effect.effectId, sourceEffectId: source.effectId, attempts: effect.attempts };
  }

  if (effect.status === "acknowledged") {
    const already = await verifyExternalState(work, effect);
    if (already) {
      effect.status = "verified";
      store.updateSagaStatus(work, saga.sagaId);
      persist?.(work);
      return { status: saga.status === "compensated" ? "compensated" : "partial", sagaId: saga.sagaId, compensationEffectId: effect.effectId, sourceEffectId: source.effectId, attempts: effect.attempts };
    }
    effect.status = "unresolved";
    store.updateSagaStatus(work, saga.sagaId);
    persist?.(work);
    return { status: saga.status === "partial" ? "partial" : "unresolved", sagaId: saga.sagaId, compensationEffectId: effect.effectId, sourceEffectId: source.effectId, attempts: effect.attempts };
  }

  const maxAttempts = Math.max(1, Math.min(request.maxAttempts ?? 2, 5));
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const receipt = await executeWithSafety({
      work,
      capability: compensationCapability!,
      request: { operation: request.operation, input: request.input, idempotencyKey: effect.idempotencyKey },
      effect,
      registry,
      verifyExternalState,
      contextLog: log
    });
    persist?.(work);

    if (receipt.status === "rejected") {
      if (attempt === maxAttempts) effect.status = "unresolved";
      continue;
    }
    if (receipt.status === "ambiguous") {
      if (attempt === maxAttempts) effect.status = "unresolved";
      continue;
    }

    const verified = await verifyExternalState(work, effect);
    effect.status = verified ? "verified" : "unresolved";
    if (verified && receipt.evidence) for (const evidence of receipt.evidence) store.addArtifact(work, evidence);
    log(verified ? "compensation.verified" : "compensation.unresolved",
      verified ? "Compensation outcome independently verified" : "Compensation receipt was not sufficient to establish verified state",
      { sagaId: saga.sagaId, sourceEffectId: source.effectId, compensationEffectId: effect.effectId });
    break;
  }

  store.updateSagaStatus(work, saga.sagaId);
  persist?.(work);
  return {
    status: saga.status === "compensated" ? "compensated" : saga.status === "partial" ? "partial" : "unresolved",
    sagaId: saga.sagaId,
    compensationEffectId: effect.effectId,
    sourceEffectId: source.effectId,
    attempts: effect.attempts
  };
}
