import type { CapabilityRegistry } from "../../capabilities/src/registry";
import type { EffectRecord, SagaRecord, WorkObject, RiskClass } from "../../core/src/types";
import { WorkStore } from "../../core/src/work";
import { executeCompensation, CompensationResult } from "../../compensation/src/engine";

export interface SagaRecoveryRepository {
  load(id: string): WorkObject;
  list(): string[];
  save(work: WorkObject): string;
}

export interface SagaRecoveryLeaseAuthority {
  acquire(resourceId: string, ownerId: string, ttlMs: number): import("../../coordination/src/leases").LeaseAcquireResult;
  renew(resourceId: string, leaseId: string, ownerId: string, ttlMs: number): import("../../coordination/src/leases").LeaseRecord;
  release(resourceId: string, leaseId: string, ownerId: string): boolean;
  get(resourceId: string): import("../../coordination/src/leases").LeaseRecord | null;
  reapExpired(): import("../../coordination/src/leases").LeaseRecord[];
}

export interface SagaRecoveryConfig {
  authority: SagaRecoveryLeaseAuthority;
  ownerId: string;
  ttlMs: number;
  heartbeatIntervalMs?: number;
}

export type SagaRecoveryStatus = "waiting_lease" | "compensated" | "partial" | "unresolved" | "no_pending";

export interface SagaRecoveryCandidate {
  workId: string;
  sagaId: string;
  sagaStatus: SagaRecord["status"];
  pendingCompensationEffectIds: string[];
}

export interface SagaRecoveryResult {
  status: SagaRecoveryStatus;
  workId: string;
  sagaId: string;
  leaseId?: string;
  completedCompensationEffectIds: string[];
  skippedVerifiedEffectIds: string[];
  attemptsByEffectId: Record<string, number>;
  invalidCompensationEffectIds?: string[];
}

function resourceId(workId: string, sagaId: string): string {
  return `saga:${workId}:recovery:${sagaId}`;
}

function isVerified(effect: EffectRecord): boolean {
  return effect.status === "verified" || effect.status === "compensated";
}

function isPending(effect: EffectRecord): boolean {
  return effect.kind === "compensation" && !isVerified(effect);
}

function validateSagaLineage(work: WorkObject, saga: SagaRecord): string[] {
  return saga.compensationEffectIds.filter(effectId => {
    const effect = work.effects.find(item => item.effectId === effectId);
    if (!effect || effect.kind !== "compensation" || !effect.sourceEffectId) return true;
    return (
      !saga.forwardEffectIds.includes(effect.sourceEffectId) ||
      !work.effects.some(source => source.effectId === effect.sourceEffectId && source.kind !== "compensation")
    );
  });
}

function requireCompensationInput(effect: EffectRecord): void {
  if (!effect.operation) throw new Error(`Persisted compensation effect is missing operation: ${effect.effectId}`);
  if (effect.kind !== "compensation") throw new Error(`Effect is not a compensation: ${effect.effectId}`);
  if (!effect.sourceEffectId) throw new Error(`Persisted compensation effect is missing sourceEffectId: ${effect.effectId}`);
}

export class SagaRecoveryCoordinator {
  constructor(
    private readonly repository: SagaRecoveryRepository,
    private readonly store: WorkStore,
    private readonly registry: CapabilityRegistry,
    private readonly lease: SagaRecoveryConfig
  ) {}

  discover(): SagaRecoveryCandidate[] {
    const candidates: SagaRecoveryCandidate[] = [];
    for (const entry of this.repository.list()) {
      if (!entry.endsWith(".json")) continue;
      const workId = entry.slice(0, -5);
      if (!/^[A-Za-z0-9._-]+$/.test(workId)) continue;
      const work = this.repository.load(workId);
      for (const saga of work.sagas ?? []) {
        const pendingCompensationEffectIds = saga.compensationEffectIds.filter(effectId => {
          const effect = work.effects.find(item => item.effectId === effectId);
          return effect ? isPending(effect) : true;
        });
        if (pendingCompensationEffectIds.length) {
          candidates.push({
            workId: work.id,
            sagaId: saga.sagaId,
            sagaStatus: saga.status,
            pendingCompensationEffectIds
          });
        }
      }
    }
    return candidates.sort((a, b) => a.workId.localeCompare(b.workId) || a.sagaId.localeCompare(b.sagaId));
  }

  async recover(args: {
    workId: string;
    sagaId: string;
    policy?: import("../../policy/src/guard").Policy;
    verifyExternalState: (work: WorkObject, effect: EffectRecord) => Promise<boolean>;
    maxAttempts?: number;
  }): Promise<SagaRecoveryResult> {
    const work = this.repository.load(args.workId);
    this.store.register(work);
    const saga = work.sagas?.find(item => item.sagaId === args.sagaId);
    if (!saga) throw new Error("Unknown saga: " + args.sagaId);

    const invalidCompensationEffectIds = validateSagaLineage(work, saga);
    if (invalidCompensationEffectIds.length) {
      this.store.event(work, "saga.recovery.invalid_lineage", "Saga recovery refused because persisted compensation lineage is invalid", {
        sagaId: saga.sagaId,
        invalidCompensationEffectIds
      });
      this.repository.save(work);
      return {
        status: "unresolved",
        workId: work.id,
        sagaId: saga.sagaId,
        completedCompensationEffectIds: [],
        skippedVerifiedEffectIds: [],
        attemptsByEffectId: {},
        invalidCompensationEffectIds
      };
    }

    const pending = saga.compensationEffectIds
      .map(effectId => work.effects.find(effect => effect.effectId === effectId))
      .filter((effect): effect is EffectRecord => effect !== undefined)
      .filter(isPending);

    const skippedVerifiedEffectIds = saga.compensationEffectIds
      .map(effectId => work.effects.find(effect => effect.effectId === effectId))
      .filter((effect): effect is EffectRecord => effect !== undefined)
      .filter(isVerified)
      .map(effect => effect.effectId);

    if (pending.length === 0) {
      this.store.updateSagaStatus(work, saga.sagaId);
      this.repository.save(work);
      return {
        status: "no_pending",
        workId: work.id,
        sagaId: saga.sagaId,
        completedCompensationEffectIds: [],
        skippedVerifiedEffectIds,
        attemptsByEffectId: {}
      };
    }

    const recoveredLeaseIds = this.lease.authority.reapExpired()
      .filter(item => item.resourceId === resourceId(work.id, saga.sagaId))
      .map(item => item.leaseId);

    const targetResource = resourceId(work.id, saga.sagaId);
    const acquired = this.lease.authority.acquire(targetResource, this.lease.ownerId, this.lease.ttlMs);
    if (acquired.status === "busy") {
      this.store.event(work, "saga.recovery.waiting_lease", "Saga recovery is waiting for another worker to release ownership", {
        sagaId: saga.sagaId,
        ownerId: this.lease.ownerId,
        currentOwnerId: acquired.lease.ownerId,
        leaseId: acquired.lease.leaseId
      });
      this.repository.save(work);
      return {
        status: "waiting_lease",
        workId: work.id,
        sagaId: saga.sagaId,
        completedCompensationEffectIds: [],
        skippedVerifiedEffectIds,
        attemptsByEffectId: {},
      };
    }

    let currentLease = acquired.lease;
    let leaseLost = false;
    const completedCompensationEffectIds: string[] = [];
    const attemptsByEffectId: Record<string, number> = {};
    const recoveredFromLeaseIds = recoveredLeaseIds;

    this.store.event(work, "saga.recovery.started", "Saga recovery lease acquired", {
      sagaId: saga.sagaId,
      ownerId: this.lease.ownerId,
      leaseId: currentLease.leaseId,
      recoveredFromLeaseIds
    });
    this.repository.save(work);

    const intervalMs = this.lease.heartbeatIntervalMs ?? Math.max(1, Math.floor(this.lease.ttlMs / 3));
    if (!Number.isSafeInteger(intervalMs) || intervalMs <= 0) throw new Error("Saga recovery heartbeat interval must be a positive safe integer");

    const heartbeatTimer = setInterval(() => {
      if (leaseLost) return;
      try {
        currentLease = this.lease.authority.renew(targetResource, currentLease.leaseId, this.lease.ownerId, this.lease.ttlMs);
        this.store.event(work, "saga.recovery.heartbeat", "Saga recovery lease renewed", {
          sagaId: saga.sagaId,
          ownerId: this.lease.ownerId,
          leaseId: currentLease.leaseId,
          revision: currentLease.revision
        });
        this.repository.save(work);
      } catch (error) {
        leaseLost = true;
        this.store.event(work, "saga.recovery.lease_lost", "Saga recovery lease was lost", {
          sagaId: saga.sagaId,
          ownerId: this.lease.ownerId,
          leaseId: currentLease.leaseId,
          error: String(error)
        });
        this.repository.save(work);
      }
    }, intervalMs);
    if (typeof (heartbeatTimer as any).unref === "function") (heartbeatTimer as any).unref();

    try {
      for (const effect of pending) {
        if (leaseLost) break;

        const observedLease = this.lease.authority.get(targetResource);
        if (!observedLease || observedLease.leaseId !== currentLease.leaseId || observedLease.ownerId !== this.lease.ownerId) {
          leaseLost = true;
          this.store.event(work, "saga.recovery.lease_lost", "Recovery ownership moved before pending compensation execution", {
            sagaId: saga.sagaId,
            ownerId: this.lease.ownerId,
            previousLeaseId: currentLease.leaseId,
            currentOwnerId: observedLease?.ownerId ?? null,
            currentLeaseId: observedLease?.leaseId ?? null
          });
          this.repository.save(work);
          break;
        }

        requireCompensationInput(effect);
        const result: CompensationResult = await executeCompensation({
          store: this.store,
          registry: this.registry,
          work,
          request: {
            sagaId: saga.sagaId,
            sourceEffectId: effect.sourceEffectId!,
            operation: effect.operation!,
            input: effect.input,
            idempotencyKey: effect.idempotencyKey,
            capability: effect.capability,
            riskClass: effect.riskClass as RiskClass,
            maxAttempts: args.maxAttempts
          },
          verifyExternalState: args.verifyExternalState,
          policy: args.policy,
          persist: value => this.repository.save(value)
        });

        attemptsByEffectId[effect.effectId] = effect.attempts;
        if (isVerified(effect)) completedCompensationEffectIds.push(effect.effectId);

        const afterLease = this.lease.authority.get(targetResource);
        if (!afterLease || afterLease.leaseId !== currentLease.leaseId || afterLease.ownerId !== this.lease.ownerId) {
          leaseLost = true;
          this.store.event(work, "saga.recovery.lease_lost", "Recovery ownership moved after compensation attempt", {
            sagaId: saga.sagaId,
            ownerId: this.lease.ownerId,
            compensationEffectId: effect.effectId,
            result: result.status,
            currentOwnerId: afterLease?.ownerId ?? null,
            currentLeaseId: afterLease?.leaseId ?? null
          });
          this.repository.save(work);
          break;
        }
      }
    } finally {
      clearInterval(heartbeatTimer);
      const finalLease = this.lease.authority.get(targetResource);
      if (finalLease && finalLease.leaseId === currentLease.leaseId && finalLease.ownerId === this.lease.ownerId) {
        try { this.lease.authority.release(targetResource, currentLease.leaseId, this.lease.ownerId); } catch {}
      }
    }

    this.store.updateSagaStatus(work, saga.sagaId);
    this.store.event(work, "saga.recovery.finished", "Saga recovery attempt finished", {
      sagaId: saga.sagaId,
      ownerId: this.lease.ownerId,
      leaseLost,
      status: saga.status
    });
    this.repository.save(work);

    const status: SagaRecoveryStatus = saga.status === "compensated"
      ? "compensated"
      : leaseLost || saga.status === "unresolved"
        ? "unresolved"
        : saga.status === "partial"
          ? "partial"
          : "unresolved";

    return {
      status,
      workId: work.id,
      sagaId: saga.sagaId,
      leaseId: currentLease.leaseId,
      completedCompensationEffectIds,
      skippedVerifiedEffectIds,
      attemptsByEffectId,
      ...(invalidCompensationEffectIds.length ? { invalidCompensationEffectIds } : {})
    };
  }
}
