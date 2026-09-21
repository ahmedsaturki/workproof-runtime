export interface LeaseRecord {
  version: "0.1";
  leaseId: string;
  resourceId: string;
  ownerId: string;
  acquiredAt: string;
  renewedAt: string;
  expiresAt: string;
  revision: number;
}

export interface WorkerRecord {
  version: "0.1";
  workerId: string;
  capabilities: string[];
  state: "active" | "offline";
  registeredAt: string;
  lastHeartbeatAt: string;
  metadata?: Record<string, string>;
}

export type LeaseAcquireResult =
  | { status: "acquired"; lease: LeaseRecord }
  | { status: "busy"; lease: LeaseRecord }
  | { status: "renewed"; lease: LeaseRecord };

export interface LeaseClock {
  nowMs(): number;
}

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

function requireNonEmpty(value: string, field: string): void {
  if (!value || !value.trim()) throw new Error(`${field} must not be empty`);
}

function requireTtl(ttlMs: number): void {
  if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0) {
    throw new Error("Lease TTL must be a positive safe integer");
  }
}

function cloneLease(lease: LeaseRecord): LeaseRecord {
  return { ...lease };
}

function cloneWorker(worker: WorkerRecord): WorkerRecord {
  return { ...worker, capabilities: worker.capabilities.slice(), metadata: worker.metadata ? { ...worker.metadata } : undefined };
}

export class LeaseStore {
  private readonly leases = new Map<string, LeaseRecord>();
  private readonly workers = new Map<string, WorkerRecord>();
  private sequence = 0;

  constructor(private readonly clock: LeaseClock = { nowMs: () => Date.now() }) {}

  registerWorker(input: {
    workerId: string;
    capabilities: string[];
    metadata?: Record<string, string>;
  }): WorkerRecord {
    requireNonEmpty(input.workerId, "workerId");
    if (!Array.isArray(input.capabilities)) throw new Error("Worker capabilities must be an array");
    const timestamp = iso(this.clock.nowMs());
    const existing = this.workers.get(input.workerId);
    const worker: WorkerRecord = {
      version: "0.1",
      workerId: input.workerId,
      capabilities: Array.from(new Set(input.capabilities.slice())).sort(),
      state: "active",
      registeredAt: existing?.registeredAt ?? timestamp,
      lastHeartbeatAt: timestamp,
      ...(input.metadata ? { metadata: { ...input.metadata } } : existing?.metadata ? { metadata: { ...existing.metadata } } : {})
    };
    this.workers.set(input.workerId, worker);
    return cloneWorker(worker);
  }

  heartbeat(workerId: string): WorkerRecord {
    const worker = this.workers.get(workerId);
    if (!worker) throw new Error(`Unknown worker: ${workerId}`);
    worker.state = "active";
    worker.lastHeartbeatAt = iso(this.clock.nowMs());
    return cloneWorker(worker);
  }

  markWorkerOffline(workerId: string): WorkerRecord {
    const worker = this.workers.get(workerId);
    if (!worker) throw new Error(`Unknown worker: ${workerId}`);
    worker.state = "offline";
    worker.lastHeartbeatAt = iso(this.clock.nowMs());
    return cloneWorker(worker);
  }

  getWorker(workerId: string): WorkerRecord | null {
    const worker = this.workers.get(workerId);
    return worker ? cloneWorker(worker) : null;
  }

  listWorkers(): WorkerRecord[] {
    return Array.from(this.workers.values()).sort((a, b) => a.workerId.localeCompare(b.workerId)).map(cloneWorker);
  }

  listWorkerStatuses(staleAfterMs: number): WorkerStatus[] {
    return this.listWorkers().map((worker) => inspectWorker(worker, this.clock.nowMs(), staleAfterMs));
  }

  getWorkerStatus(workerId: string, staleAfterMs: number): WorkerStatus | null {
    const worker = this.getWorker(workerId);
    return worker ? inspectWorker(worker, this.clock.nowMs(), staleAfterMs) : null;
  }

  checkReassignment(resourceId: string, workerId: string, staleAfterMs: number): ReassignmentCheck {
    const worker = this.getWorkerStatus(workerId, staleAfterMs);
    if (!worker) return { eligible: false, reason: "worker-missing" };
    if (!worker.reassignmentEligible) return { eligible: false, reason: "worker-active", worker };
    const lease = this.get(resourceId);
    if (lease && lease.ownerId === workerId) return { eligible: false, reason: "lease-active", worker, lease };
    if (lease && lease.ownerId !== workerId) return { eligible: false, reason: "lease-owned-by-other", worker, lease };
    return { eligible: true, reason: worker.liveness === "offline" ? "worker-offline" : "lease-free", worker };
  }

  acquire(resourceId: string, ownerId: string, ttlMs: number): LeaseAcquireResult {
    requireNonEmpty(resourceId, "resourceId");
    requireNonEmpty(ownerId, "ownerId");
    requireTtl(ttlMs);

    const now = this.clock.nowMs();
    const existing = this.leases.get(resourceId);
    if (existing && Date.parse(existing.expiresAt) > now) {
      if (existing.ownerId === ownerId) {
        existing.renewedAt = iso(now);
        existing.expiresAt = iso(now + ttlMs);
        existing.revision += 1;
        return { status: "renewed", lease: cloneLease(existing) };
      }
      return { status: "busy", lease: cloneLease(existing) };
    }

    const lease: LeaseRecord = {
      version: "0.1",
      leaseId: `lease_${++this.sequence}`,
      resourceId,
      ownerId,
      acquiredAt: iso(now),
      renewedAt: iso(now),
      expiresAt: iso(now + ttlMs),
      revision: 1
    };
    this.leases.set(resourceId, lease);
    return { status: "acquired", lease: cloneLease(lease) };
  }

  get(resourceId: string): LeaseRecord | null {
    requireNonEmpty(resourceId, "resourceId");
    const lease = this.leases.get(resourceId);
    if (!lease) return null;
    if (Date.parse(lease.expiresAt) <= this.clock.nowMs()) return null;
    return cloneLease(lease);
  }

  renew(resourceId: string, leaseId: string, ownerId: string, ttlMs: number): LeaseRecord {
    requireNonEmpty(resourceId, "resourceId");
    requireNonEmpty(leaseId, "leaseId");
    requireNonEmpty(ownerId, "ownerId");
    requireTtl(ttlMs);

    const lease = this.leases.get(resourceId);
    if (!lease || Date.parse(lease.expiresAt) <= this.clock.nowMs()) throw new Error("Lease is expired or missing");
    if (lease.leaseId !== leaseId || lease.ownerId !== ownerId) throw new Error("Lease ownership mismatch");

    const now = this.clock.nowMs();
    lease.renewedAt = iso(now);
    lease.expiresAt = iso(now + ttlMs);
    lease.revision += 1;
    return cloneLease(lease);
  }

  release(resourceId: string, leaseId: string, ownerId: string): boolean {
    requireNonEmpty(resourceId, "resourceId");
    requireNonEmpty(leaseId, "leaseId");
    requireNonEmpty(ownerId, "ownerId");

    const lease = this.leases.get(resourceId);
    if (!lease) return false;
    if (lease.leaseId !== leaseId || lease.ownerId !== ownerId) throw new Error("Lease ownership mismatch");
    this.leases.delete(resourceId);
    return true;
  }

  assertOwned(resourceId: string, leaseId: string, ownerId: string): LeaseRecord {
    const lease = this.get(resourceId);
    if (!lease || lease.leaseId !== leaseId || lease.ownerId !== ownerId) {
      throw new Error("Lease is not currently owned by caller");
    }
    return lease;
  }

  reapExpired(): LeaseRecord[] {
    const now = this.clock.nowMs();
    const expired: LeaseRecord[] = [];
    for (const [resourceId, lease] of this.leases) {
      if (Date.parse(lease.expiresAt) <= now) {
        expired.push(cloneLease(lease));
        this.leases.delete(resourceId);
      }
    }
    return expired.sort((a, b) => a.resourceId.localeCompare(b.resourceId));
  }

  listLeases(): LeaseRecord[] {
    this.reapExpired();
    return Array.from(this.leases.values()).sort((a, b) => a.resourceId.localeCompare(b.resourceId)).map(cloneLease);
  }
}


export type WorkerLiveness = "active" | "stale" | "offline";

export interface WorkerStatus extends WorkerRecord {
  liveness: WorkerLiveness;
  heartbeatAgeMs: number;
  staleAfterMs: number;
  reassignmentEligible: boolean;
}

export type ReassignmentReason =
  | "worker-missing"
  | "worker-active"
  | "lease-active"
  | "lease-owned-by-other"
  | "worker-stale"
  | "worker-offline"
  | "lease-free";

export interface ReassignmentCheck {
  eligible: boolean;
  reason: ReassignmentReason;
  worker?: WorkerStatus;
  lease?: LeaseRecord;
}

function requireStaleAfter(staleAfterMs: number): void {
  if (!Number.isSafeInteger(staleAfterMs) || staleAfterMs <= 0) {
    throw new Error("Worker stale threshold must be a positive safe integer");
  }
}

export function inspectWorker(worker: WorkerRecord, nowMs: number, staleAfterMs: number): WorkerStatus {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) throw new Error("Worker inspection time must be a non-negative safe integer");
  requireStaleAfter(staleAfterMs);
  const heartbeat = Date.parse(worker.lastHeartbeatAt);
  if (!Number.isFinite(heartbeat)) throw new Error("Worker heartbeat timestamp is invalid");
  const heartbeatAgeMs = Math.max(0, nowMs - heartbeat);
  const liveness: WorkerLiveness =
    worker.state === "offline" ? "offline" :
    heartbeatAgeMs > staleAfterMs ? "stale" : "active";
  return {
    ...cloneWorker(worker),
    liveness,
    heartbeatAgeMs,
    staleAfterMs,
    reassignmentEligible: liveness !== "active"
  };
}

export interface LeaseStatus {
  version: "0.1";
  leaseId: string;
  resourceId: string;
  ownerId: string;
  acquiredAt: string;
  renewedAt: string;
  expiresAt: string;
  revision: number;
  active: boolean;
}

export function projectLeaseStatus(lease: LeaseRecord, nowMs: number): LeaseStatus {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) throw new Error("Lease inspection time must be a non-negative safe integer");
  const expiresAt = Date.parse(lease.expiresAt);
  if (!Number.isFinite(expiresAt)) throw new Error("Lease expiry timestamp is invalid");
  return {
    version: "0.1",
    leaseId: lease.leaseId,
    resourceId: lease.resourceId,
    ownerId: lease.ownerId,
    acquiredAt: lease.acquiredAt,
    renewedAt: lease.renewedAt,
    expiresAt: lease.expiresAt,
    revision: lease.revision,
    active: expiresAt > nowMs
  };
}
