import { Capability, RiskClass, WorkObject } from "../../core/src/types";
import { LeaseAcquireResult, LeaseRecord } from "../../coordination/src/leases";
import { CapabilityRegistry } from "../../capabilities/src/registry";
import { VerificationEngine } from "../../verification/src/engine";

import { WorkStore } from "../../core/src/work";
import { executeWithSafety, chooseRecovery } from "../../recovery/src/engine";
import { canExecute, Policy } from "../../policy/src/guard";

const rank: Record<RiskClass, number> = { read: 0, local_write: 1, external_write: 2, destructive: 3, financial: 4 };

export interface WorkStep {
  id: string;
  operation: string;
  capability?: string;
  input: unknown;
  idempotencyKey: string;
  riskClass: RiskClass;
  preferredCapabilities?: string[];
  maxAttempts?: number;
}

export interface WorkRepository {
  save(work: WorkObject): string;
}

export interface ExecutionLeaseAuthority {
  acquire(resourceId: string, ownerId: string, ttlMs: number): import("../../coordination/src/leases").LeaseAcquireResult;
  renew(resourceId: string, leaseId: string, ownerId: string, ttlMs: number): import("../../coordination/src/leases").LeaseRecord;
  release(resourceId: string, leaseId: string, ownerId: string): boolean;
}

export interface ExecutionLeaseConfig {
  authority: ExecutionLeaseAuthority;
  ownerId: string;
  ttlMs: number;
  heartbeatIntervalMs?: number;
  resourceId?: (work: WorkObject, step: WorkStep) => string;
}

export class WorkEngine {
  constructor(
    private readonly store: WorkStore,
    private readonly registry: CapabilityRegistry,
    private readonly verification: VerificationEngine,
    private readonly verifyEffect: (work: WorkObject, effectId: string) => Promise<boolean>,
    private readonly policy?: Policy,
    private readonly repository?: WorkRepository,
    private readonly executionLease?: ExecutionLeaseConfig
  ) {}

  private persist(work: WorkObject): void { this.repository?.save(work); }

  private resolveCapability(step: WorkStep, blocked: Set<string>): Capability {
    if (step.capability && !blocked.has(step.capability)) {
      const explicit = this.registry.get(step.capability);
      if (!step.operation || explicit.operations.includes(step.operation)) return explicit;
    }
    const candidates = this.registry.findFor(step.operation).filter(c => rank[c.riskClass] <= rank[step.riskClass] && !blocked.has(c.name));
    for (const preferred of step.preferredCapabilities ?? []) {
      const match = candidates.find(c => c.name === preferred);
      if (match) return match;
    }
    const first = candidates.sort((a, b) => rank[a.riskClass] - rank[b.riskClass] || a.name.localeCompare(b.name))[0];
    if (!first) throw new Error("No capability can satisfy operation=" + step.operation);
    return first;
  }

  private leaseResourceId(work: WorkObject, step: WorkStep): string {
    return this.executionLease?.resourceId?.(work, step) ?? ("work:" + work.id + ":step:" + step.id);
  }

  async run(work: WorkObject, steps: WorkStep[]): Promise<WorkObject> {
    this.store.transition(work, "running", "Work execution started");
    this.persist(work);

    for (const step of steps) {
      const maxAttempts = Math.max(1, Math.min(step.maxAttempts ?? 3, 5));
      const blocked = new Set<string>();

      if (rank[step.riskClass] > rank[work.contract.riskClass]) {
        this.store.transition(work, "failed", "Step " + step.id + " risk " + step.riskClass + " exceeds work contract risk ceiling " + work.contract.riskClass);
        this.persist(work);
        return work;
      }

      let lease: import("../../coordination/src/leases").LeaseRecord | null = null;
      let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
      let leaseLost: string | null = null;
      const resourceId = this.executionLease ? this.leaseResourceId(work, step) : null;

      if (this.executionLease && resourceId) {
        try {
          const acquired = this.executionLease.authority.acquire(resourceId, this.executionLease.ownerId, this.executionLease.ttlMs);
          if (acquired.status === "busy") {
            this.store.event(work, "lease.busy", "Execution lease is busy for step " + step.id, {
              stepId: step.id,
              resourceId,
              ownerId: this.executionLease.ownerId,
              currentOwnerId: acquired.lease.ownerId,
              leaseId: acquired.lease.leaseId
            });
            this.store.transition(work, "waiting_lease", "Waiting for execution lease for step " + step.id);
            this.persist(work);
            return work;
          }

          lease = acquired.lease;
          this.store.event(
            work,
            acquired.status === "renewed" ? "lease.renewed" : "lease.acquired",
            "Execution lease " + acquired.status + " for step " + step.id,
            {
              stepId: step.id,
              resourceId,
              ownerId: this.executionLease.ownerId,
              leaseId: lease.leaseId,
              revision: lease.revision
            }
          );

          const intervalMs = this.executionLease.heartbeatIntervalMs ?? Math.max(1, Math.floor(this.executionLease.ttlMs / 3));
          if (!Number.isSafeInteger(intervalMs) || intervalMs <= 0) {
            throw new Error("Execution lease heartbeat interval must be a positive safe integer");
          }

          heartbeatTimer = setInterval(() => {
            if (!lease || leaseLost) return;
            try {
              lease = this.executionLease!.authority.renew(
                resourceId,
                lease.leaseId,
                this.executionLease!.ownerId,
                this.executionLease!.ttlMs
              );
              this.store.event(work, "lease.heartbeat", "Execution lease renewed for step " + step.id, {
                stepId: step.id,
                resourceId,
                ownerId: this.executionLease!.ownerId,
                leaseId: lease.leaseId,
                revision: lease.revision
              });
              this.persist(work);
            } catch (error) {
              leaseLost = String(error);
              this.store.event(work, "lease.lost", "Execution lease lost during step " + step.id, {
                stepId: step.id,
                resourceId,
                ownerId: this.executionLease!.ownerId,
                leaseId: lease!.leaseId,
                error: leaseLost
              });
              this.persist(work);
            }
          }, intervalMs);

          if (heartbeatTimer && typeof (heartbeatTimer as any).unref === "function") {
            (heartbeatTimer as any).unref();
          }
        } catch (error) {
          this.store.event(work, "lease.acquire_failed", "Execution lease acquisition failed for step " + step.id, {
            stepId: step.id,
            resourceId,
            ownerId: this.executionLease.ownerId,
            error: String(error)
          });
          this.store.transition(work, "unresolved", "Execution lease could not be acquired for step " + step.id);
          this.persist(work);
          return work;
        }
      }

      try {
        let completed = false;

        for (let attempt = 1; attempt <= maxAttempts && !completed; attempt++) {
          if (leaseLost) {
            this.store.transition(work, "unresolved", "Execution lease was lost before step " + step.id + " completed");
            this.persist(work);
            return work;
          }

          let capability: Capability;
          try {
            capability = this.resolveCapability(step, blocked);
          } catch (error) {
            this.store.transition(work, "failed", "Step " + step.id + " cannot be routed: " + String(error));
            this.persist(work);
            return work;
          }

          if (rank[capability.riskClass] > rank[step.riskClass]) {
            this.store.transition(work, "failed", "Capability " + capability.name + " exceeds requested risk ceiling");
            this.persist(work);
            return work;
          }

          if (this.policy) {
            const decision = canExecute(this.policy, work, capability.riskClass);
            if (!decision.allowed) {
              this.store.transition(work, "failed", "Policy blocked step " + step.id + ": " + decision.reason);
              this.persist(work);
              return work;
            }
          }

          if (lease && this.executionLease && resourceId) {
            try {
              lease = this.executionLease.authority.renew(
                resourceId,
                lease.leaseId,
                this.executionLease.ownerId,
                this.executionLease.ttlMs
              );
            } catch (error) {
              leaseLost = String(error);
              this.store.event(work, "lease.lost", "Execution lease renewal failed before attempt " + attempt, {
                stepId: step.id,
                attempt,
                error: leaseLost
              });
              this.store.transition(work, "unresolved", "Execution lease was lost before attempt " + attempt + " of step " + step.id);
              this.persist(work);
              return work;
            }
          }

          const effect = this.store.addEffect(work, capability.name, capability.riskClass, step.idempotencyKey, step.operation);
          this.store.event(work, "step.started", "Step " + step.id + " started", {
            stepId: step.id,
            capability: capability.name,
            attempt,
            operation: step.operation
          });
          this.persist(work);

          if (["acknowledged", "observed", "verified", "reconciled"].includes(effect.status)) {
            completed = true;
            this.store.event(work, "step.resumed", "Skipping already-completed effect during resume: " + effect.effectId, {
              stepId: step.id,
              effectId: effect.effectId,
              effectStatus: effect.status
            });
            this.persist(work);
            break;
          }

          const receipt = await executeWithSafety({
            work,
            capability,
            request: { operation: step.operation, input: step.input, idempotencyKey: effect.idempotencyKey },
            effect,
            registry: this.registry,
            verifyExternalState: async () => this.verifyEffect(work, effect.effectId),
            contextLog: (type, message, data) => this.store.event(work, type, message, data)
          });

          this.store.event(work, "step.finished", "Step " + step.id + " finished", {
            status: receipt.status,
            stepId: step.id,
            attempt,
            receiptData: receipt.data ?? null,
            externalEffectId: receipt.externalEffectId ?? null
          });
          this.persist(work);

          if (leaseLost) {
            this.store.transition(work, "unresolved", "Execution lease was lost during step " + step.id + "; outcome requires reconciliation");
            this.persist(work);
            return work;
          }

          if (receipt.status === "accepted") {
            completed = true;
            if (receipt.evidence) for (const evidence of receipt.evidence) this.store.addArtifact(work, evidence);
          } else if (receipt.status === "rejected") {
            blocked.add(capability.name);
            if (attempt === maxAttempts) {
              this.store.transition(work, "failed", "Step " + step.id + " rejected after " + attempt + " attempts");
              this.persist(work);
              return work;
            }
          } else {
            const candidates = this.registry.findFor(step.operation).filter(c =>
              c.name !== capability.name &&
              rank[c.riskClass] <= rank[step.riskClass] &&
              !blocked.has(c.name)
            );
            const decision = chooseRecovery(effect, candidates);
            if (decision === "substitute") {
              blocked.add(capability.name);
              this.store.event(work, "recovery.substitute", "Substituting capability after repeated ambiguity: " + capability.name, { stepId: step.id });
              continue;
            }
            if (decision === "stop" || attempt === maxAttempts) {
              this.store.transition(work, "unresolved", "Step " + step.id + " remained ambiguous after " + attempt + " attempts");
              this.persist(work);
              return work;
            }
          }
        }

        if (!completed) {
          this.store.transition(work, "failed", "Step " + step.id + " did not complete");
          this.persist(work);
          return work;
        }
      } finally {
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        if (lease && this.executionLease && resourceId) {
          try {
            this.executionLease.authority.release(resourceId, lease.leaseId, this.executionLease.ownerId);
            this.store.event(work, "lease.released", "Execution lease released for step " + step.id, {
              stepId: step.id,
              resourceId,
              ownerId: this.executionLease.ownerId,
              leaseId: lease.leaseId
            });
            this.persist(work);
          } catch (error) {
            this.store.event(work, "lease.release_failed", "Execution lease release could not be confirmed for step " + step.id, {
              stepId: step.id,
              resourceId,
              ownerId: this.executionLease.ownerId,
              leaseId: lease.leaseId,
              error: String(error)
            });
            this.persist(work);
          }
        }
      }
    }

    await this.verification.verify(work);
    this.persist(work);
    return work;
  }
}

