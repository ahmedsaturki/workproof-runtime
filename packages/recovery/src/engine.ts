import { CapabilityRegistry } from "../../capabilities/src/registry";
import { Capability, CapabilityReceipt, EffectAttempt, EffectRecord, WorkObject } from "../../core/src/types";

export type RecoveryDecision = "reconcile" | "retry" | "substitute" | "stop";

export function chooseRecovery(effect: EffectRecord, candidates: Capability[]): RecoveryDecision {
  if (effect.status === "unknown" || effect.status === "dispatched") return "reconcile";
  if (effect.attempts >= 2) return candidates.length ? "substitute" : "stop";
  return "retry";
}

export async function executeWithSafety(args: {
  work: WorkObject;
  capability: Capability;
  request: { operation: string; input: unknown; idempotencyKey: string };
  effect: EffectRecord;
  registry: CapabilityRegistry;
  verifyExternalState: (work: WorkObject, effect: EffectRecord) => Promise<boolean>;
  contextLog: (type: string, message: string, data?: Record<string, unknown>) => void;
}): Promise<CapabilityReceipt> {
  const { work, capability, request, effect, verifyExternalState, contextLog } = args;
  if (effect.status === "unknown" || effect.status === "dispatched") {
    contextLog("recovery.reconcile", "Reconciling ambiguous effect before retry", { effectId: effect.effectId });
    try {
      if (await verifyExternalState(work, effect)) {
        effect.status = "verified";
        contextLog("effect.verified", "External effect found during reconciliation", { effectId: effect.effectId });
        return { status: "accepted", externalEffectId: effect.effectId };
      }
    } catch (error) {
      contextLog("recovery.reconcile_failed", "External reconciliation check failed", { effectId: effect.effectId, error: String(error) });
    }
  }

  effect.attempts += 1;
  effect.status = "dispatched";
  const startedAt = new Date().toISOString();
  const attempt: EffectAttempt = { attempt: effect.attempts, capability: capability.name, status: "dispatched", startedAt };
  effect.attemptLog.push(attempt);

  let receipt: CapabilityReceipt;
  try {
    receipt = await capability.execute(request, { work, effect, log: contextLog });
  } catch (error) {
    effect.status = "unknown";
    attempt.status = "ambiguous";
    attempt.finishedAt = new Date().toISOString();
    attempt.receipt = { status: "ambiguous" };
    contextLog("effect.ambiguous", "Capability raised after dispatch; outcome is ambiguous", { effectId: effect.effectId, error: String(error) });
    return { status: "ambiguous", data: { error: String(error) } };
  }

  attempt.status = receipt.status;
  attempt.finishedAt = new Date().toISOString();
  attempt.receipt = receipt;

  if (receipt.status === "accepted") {
    effect.status = "acknowledged";
    effect.receipt = { externalEffectId: receipt.externalEffectId, data: receipt.data };
  } else if (receipt.status === "rejected") {
    effect.status = "unresolved";
  } else {
    effect.status = "unknown";
  }
  effect.updatedAt = attempt.finishedAt;
  return receipt;
}
