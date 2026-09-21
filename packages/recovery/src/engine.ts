import { CapabilityRegistry } from "../../capabilities/src/registry";
import { Capability, CapabilityReceipt, EffectAttempt, EffectRecord, WorkObject } from "../../core/src/types";

export type RecoveryDecision = "reconcile" | "retry" | "substitute" | "stop";

export function chooseRecovery(effect: EffectRecord, candidates: Capability[]): RecoveryDecision {
  if (effect.attempts >= 2) return candidates.length > 0 ? "substitute" : "stop";
  if (effect.status === "unknown" || effect.status === "dispatched") return "reconcile";
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
      const resolved = await verifyExternalState(work, effect);
      if (resolved) {
        effect.status = "verified";
        effect.updatedAt = new Date().toISOString();
        contextLog("effect.verified", "External effect found during reconciliation", { effectId: effect.effectId });
        return { status: "accepted", externalEffectId: effect.effectId };
      }
    } catch (error) {
      contextLog("recovery.reconcile_failed", "External reconciliation check failed; preserving ambiguous state", { effectId: effect.effectId, error: String(error) });
    }
  }

  effect.attempts += 1;
  effect.status = "dispatched";
  effect.updatedAt = new Date().toISOString();
  const attempt: EffectAttempt = { attempt: effect.attempts, capability: capability.name, status: "dispatched", startedAt: effect.updatedAt };
  effect.attemptLog.push(attempt);
  let receipt: CapabilityReceipt;
  try {
    receipt = await capability.execute(request, {
      work, effect,
      log: contextLog
    });
  } catch (error) {
    // A transport/runtime exception after dispatch is ambiguous by default.
    // Reconcile the external world before any retry to avoid duplicate effects.
    effect.status = "unknown";
    effect.updatedAt = new Date().toISOString();
    attempt.status = "ambiguous"; attempt.finishedAt = effect.updatedAt; attempt.receipt = { status: "ambiguous" };
    contextLog("effect.ambiguous", "Capability raised an exception; outcome is ambiguous", { effectId: effect.effectId, error: String(error) });
    return { status: "ambiguous", data: { error: String(error) } };
  }
  attempt.status = receipt.status; attempt.finishedAt = new Date().toISOString(); attempt.receipt = receipt;
  if (receipt.status === "ambiguous") {
    effect.status = "unknown";
  } else if (receipt.status === "accepted") {
    effect.status = "acknowledged";
    effect.receipt = { externalEffectId: receipt.externalEffectId, data: receipt.data };
  } else {
    effect.status = "unresolved";
  }
  effect.updatedAt = attempt.finishedAt;
  return receipt;
}
