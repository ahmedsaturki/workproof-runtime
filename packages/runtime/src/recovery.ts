import type { LeaseRecord } from "../../coordination/src/leases";
import type { WorkObject } from "../../core/src/types";
import type { WorkStore } from "../../core/src/work";
import type { WorkEngine, WorkStep } from "./engine";

export interface RecoverableWorkRepository {
  load(id: string): WorkObject;
  list(): string[];
}

export interface RecoveryLeaseAuthority {
  reapExpired(): LeaseRecord[];
  get(resourceId: string): LeaseRecord | null;
}

export type RecoveryEligibility = "recoverable" | "not_recoverable";

export interface RecoveryCandidate {
  workId: string;
  status: WorkObject["status"];
  eligibility: RecoveryEligibility;
}

const recoverableStatuses = new Set<WorkObject["status"]>([
  "running",
  "waiting_lease",
  "unresolved"
]);

function workIdFromEntry(entry: string): string | null {
  if (!entry.endsWith(".json")) return null;
  const id = entry.slice(0, -5);
  return /^[A-Za-z0-9._-]+$/.test(id) ? id : null;
}

export class WorkRecoveryCoordinator {
  constructor(
    private readonly repository: RecoverableWorkRepository,
    private readonly store: WorkStore,
    private readonly leaseAuthority: RecoveryLeaseAuthority
  ) {}

  discover(): RecoveryCandidate[] {
    return this.repository
      .list()
      .map(workIdFromEntry)
      .filter((id): id is string => Boolean(id))
      .map((workId) => {
        const work = this.repository.load(workId);
        return {
          workId,
          status: work.status,
          eligibility: recoverableStatuses.has(work.status) ? "recoverable" : "not_recoverable"
        };
      })
      .filter((candidate) => candidate.eligibility === "recoverable")
      .sort((a, b) => a.workId.localeCompare(b.workId));
  }

  async recover(args: {
    workId: string;
    ownerId: string;
    steps: WorkStep[];
    engine: WorkEngine;
  }): Promise<WorkObject> {
    const work = this.repository.load(args.workId);
    if (!recoverableStatuses.has(work.status)) {
      throw new Error(`Work is not recoverable in status=${work.status}`);
    }

    this.store.register(work);
    const expired = this.leaseAuthority.reapExpired();
    this.store.event(work, "recovery.started", "Recovering persisted work after worker ownership loss", {
      workId: work.id,
      ownerId: args.ownerId,
      expiredLeaseIds: expired
        .filter((lease) => lease.resourceId.startsWith(`work:${work.id}:step:`))
        .map((lease) => lease.leaseId)
    });

    const path = this.repository.save?.(work);
    if (path) void path;

    const recovered = await args.engine.run(work, args.steps);
    this.store.event(work, "recovery.finished", "Persisted work recovery attempt finished", {
      workId: work.id,
      ownerId: args.ownerId,
      status: recovered.status
    });
    return recovered;
  }
}
