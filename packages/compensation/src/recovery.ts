import { CapabilityRegistry } from "../../capabilities/src/registry";
import { EffectRecord, RiskClass, SagaRecord, WorkObject } from "../../core/src/types";
import { WorkStore } from "../../core/src/work";
import { executeCompensation, CompensationRequest } from "./engine";

export interface SagaRecoveryRepository {
  load(id: string): WorkObject;
  save(work: WorkObject): string;
}

export interface SagaRecoveryLeaseAuthority {
  acquire(resourceId: string, ownerId: string, ttlMs: number): import("../../coordination/src/leases").LeaseAcquireResult;
  renew(resourceId: string, leaseId: string, ownerId: string, ttlMs: number): import("../../coordination/src/leases").LeaseRecord;
  release(resourceId: string, leaseId: string, ownerId: string): boolean;
  assertOwned(resourceId: string, leaseId: string, ownerId: string): import("../../coordination/src/leases").LeaseRecord;
}

export type SagaRecoveryStatus = "compensated" | "partial" | "unresolved" | "waiting_lease";

export interface SagaRecoveryResult {
  workId: string;
  sagaId: string;
  ownerId: string;
  status: SagaRecoveryStatus;
  resumed: boolean;
  compensatedEffectIds: string[];
  skippedVerifiedEffectIds: string[];
}

function findSaga(work: WorkObject, sagaId: string): SagaRecord {
  const saga = work.sagas?.find(item => item.sagaId === sagaId);
  if (!saga) throw new Error("Unknown saga: " + sagaId);
  return saga;
}

function findSource(work: WorkObject, effectId: string): EffectRecord {
  const effect = work.effects.find(item => item.effectId === effectId);
  if (!effect) throw new Error("Unknown forward effect: " + effectId);
  return effect;
}

function isVerifiedCompensation(effect: EffectRecord): boolean {
  return effect.kind === "compensation" && ["verified", "compensated"].includes(effect.status);
}

export class SagaRecoveryCoordinator {
  constructor(
    private readonly repository: SagaRecoveryRepository,
    private readonly store: WorkStore,
    private readonly registry: CapabilityRegistry,
    private readonly leaseAuthority: SagaRecoveryLeaseAuthority
  ) {}

  async recover(args: {
    workId: string;
    sagaId: string;
    ownerId: string;
    ttlMs: number;
    heartbeatIntervalMs?: number;
    planForSourceEffect: (source: EffectRecord) => CompensationRequest | null;
    verifyExternalState: (work: WorkObject, effect: EffectRecord) => Promise<boolean>;
    policy?: import("../../policy/src/guard").Policy;
  }): Promise<SagaRecoveryResult> {
    const work = this.repository.load(args.workId);
    const saga = findSaga(work, args.sagaId);
    const resourceId = `work:${work.id}:saga:${saga.sagaId}`;
    const acquired = this.leaseAuthority.acquire(resourceId, args.ownerId, args.ttlMs);

    if (acquired.status === "busy") {
      this.store.event(work, "saga.recovery_waiting_lease", "Saga recovery lease is held by another worker", {
        sagaId: saga.sagaId,
        ownerId: args.ownerId,
        currentOwnerId: acquired.lease.ownerId,
        leaseId: acquired.lease.leaseId
      });
      this.repository.save(work);
      return {
        workId: work.id,
        sagaId: saga.sagaId,
        ownerId: args.ownerId,
        status: "waiting_lease",
        resumed: true,
        compensatedEffectIds: [],
        skippedVerifiedEffectIds: []
      };
    }

    let lease = acquired.lease;
    let lost: string | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    const compensatedEffectIds: string[] = [];
    const skippedVerifiedEffectIds: string[] = [];

    this.store.event(work, "saga.recovery_started", "Saga recovery acquired execution ownership", {
      sagaId: saga.sagaId,
      ownerId: args.ownerId,
      resourceId,
      leaseId: lease.leaseId
    });
    this.repository.save(work);

    try {
      const intervalMs = args.heartbeatIntervalMs ?? Math.max(1, Math.floor(args.ttlMs / 3));
      if (!Number.isSafeInteger(intervalMs) || intervalMs <= 0) throw new Error("Saga recovery heartbeat interval must be a positive safe integer");

      timer = setInterval(() => {
        if (lost) return;
        try {
          lease = this.leaseAuthority.renew(resourceId, lease.leaseId, args.ownerId, args.ttlMs);
          this.store.event(work, "saga.recovery_heartbeat", "Saga recovery lease renewed", {
            sagaId: saga.sagaId,
            ownerId: args.ownerId,
            leaseId: lease.leaseId,
            revision: lease.revision
          });
          this.repository.save(work);
        } catch (error) {
          lost = String(error);
          this.store.event(work, "saga.recovery_lease_lost", "Saga recovery lease was lost", {
            sagaId: saga.sagaId,
            ownerId: args.ownerId,
            leaseId: lease.leaseId,
            error: lost
          });
          this.repository.save(work);
        }
      }, intervalMs);

      if (timer && typeof (timer as any).unref === "function") (timer as any).unref();

      for (const forwardEffectId of saga.forwardEffectIds) {
        if (lost) break;
        try {
          this.leaseAuthority.assertOwned(resourceId, lease.leaseId, args.ownerId);
        } catch (error) {
          lost = String(error);
          this.store.event(work, "saga.recovery_lease_lost", "Saga recovery ownership could not be confirmed", {
            sagaId: saga.sagaId,
            ownerId: args.ownerId,
            leaseId: lease.leaseId,
            error: lost
          });
          break;
        }

        const source = findSource(work, forwardEffectId);
        const existing = work.effects.find(effect => effect.sourceEffectId === source.effectId && isVerifiedCompensation(effect));
        if (existing) {
          skippedVerifiedEffectIds.push(existing.effectId);
          this.store.event(work, "saga.recovery_skipped_verified", "Skipping already verified compensation", {
            sagaId: saga.sagaId,
            sourceEffectId: source.effectId,
            compensationEffectId: existing.effectId
          });
          continue;
        }

        const request = args.planForSourceEffect(source);
        if (!request) {
          this.store.event(work, "saga.recovery_plan_missing", "No compensation recovery plan is available for a pending forward effect", {
            sagaId: saga.sagaId,
            sourceEffectId: source.effectId
          });
          saga.status = "unresolved";
          this.repository.save(work);
          continue;
        }

        if (request.sagaId !== saga.sagaId || request.sourceEffectId !== source.effectId) {
          throw new Error("Compensation recovery plan does not match the requested saga/source effect");
        }

        const result = await executeCompensation({
          store: this.store,
          registry: this.registry,
          work,
          request,
          verifyExternalState: args.verifyExternalState,
          policy: args.policy,
          persist: value => this.repository.save(value)
        });

        if (result.compensationEffectId && result.status !== "blocked") {
          const effect = work.effects.find(item => item.effectId === result.compensationEffectId);
          if (effect && isVerifiedCompensation(effect) && !compensatedEffectIds.includes(effect.effectId)) {
            compensatedEffectIds.push(effect.effectId);
          }
        }

        if (lost) break;
      }
    } finally {
      if (timer) clearInterval(timer);
      if (!lost) {
        try {
          this.leaseAuthority.release(resourceId, lease.leaseId, args.ownerId);
        } catch (error) {
          this.store.event(work, "saga.recovery_release_failed", "Saga recovery lease release failed", {
            sagaId: saga.sagaId,
            ownerId: args.ownerId,
            leaseId: lease.leaseId,
            error: String(error)
          });
        }
      }
      this.store.updateSagaStatus(work, saga.sagaId);
      this.store.event(work, "saga.recovery_finished", "Saga recovery attempt finished", {
        sagaId: saga.sagaId,
        ownerId: args.ownerId,
        status: saga.status,
        lostLease: Boolean(lost)
      });
      this.repository.save(work);
    }

    const status: SagaRecoveryStatus = lost
      ? (saga.status === "compensated" ? "compensated" : "unresolved")
      : saga.status === "compensated"
        ? "compensated"
        : saga.status === "partial"
          ? "partial"
          : "unresolved";

    return {
      workId: work.id,
      sagaId: saga.sagaId,
      ownerId: args.ownerId,
      status,
      resumed: true,
      compensatedEffectIds,
      skippedVerifiedEffectIds
    };
  }
}
