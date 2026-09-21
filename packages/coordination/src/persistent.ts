const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

import { LeaseClock, LeaseAcquireResult, LeaseRecord, WorkerRecord } from "./leases";

interface SqlLeaseRow {
  lease_number: number;
  resource_id: string;
  lease_id: string;
  owner_id: string;
  acquired_at: number;
  renewed_at: number;
  expires_at: number;
  revision: number;
}

interface SqlWorkerRow {
  worker_id: string;
  capabilities_json: string;
  state: "active" | "offline";
  registered_at: number;
  last_heartbeat_at: number;
  metadata_json: string | null;
}

function requireNonEmpty(value: string, field: string): void {
  if (!value || !value.trim()) throw new Error(`${field} must not be empty`);
}

function requireTtl(ttlMs: number): void {
  if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0) {
    throw new Error("Lease TTL must be a positive safe integer");
  }
}

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

function cloneLease(lease: LeaseRecord): LeaseRecord {
  return { ...lease };
}

function cloneWorker(worker: WorkerRecord): WorkerRecord {
  return {
    ...worker,
    capabilities: worker.capabilities.slice(),
    metadata: worker.metadata ? { ...worker.metadata } : undefined
  };
}

export interface PersistentLeaseStoreOptions {
  clock?: LeaseClock;
  timeoutMs?: number;
}

export class PersistentLeaseStore {
  private readonly db: any;
  private readonly clock: LeaseClock;

  constructor(dbPath: string, options: PersistentLeaseStoreOptions = {}) {
    requireNonEmpty(dbPath, "dbPath");
    if (dbPath !== ":memory:") {
      fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
    }
    this.clock = options.clock ?? { nowMs: () => Date.now() };
    const timeoutMs = options.timeoutMs ?? 1000;
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 0) throw new Error("SQLite timeout must be a non-negative safe integer");

    this.db = new DatabaseSync(dbPath, { timeout: timeoutMs });
    this.db.exec(`
      PRAGMA foreign_keys = ON;
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS leases (
        lease_number INTEGER PRIMARY KEY AUTOINCREMENT,
        resource_id TEXT NOT NULL UNIQUE,
        lease_id TEXT NOT NULL UNIQUE,
        owner_id TEXT NOT NULL,
        acquired_at INTEGER NOT NULL,
        renewed_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        revision INTEGER NOT NULL CHECK (revision > 0)
      );

      CREATE INDEX IF NOT EXISTS leases_expires_idx ON leases(expires_at);

      CREATE TABLE IF NOT EXISTS workers (
        worker_id TEXT PRIMARY KEY,
        capabilities_json TEXT NOT NULL,
        state TEXT NOT NULL CHECK (state IN ('active', 'offline')),
        registered_at INTEGER NOT NULL,
        last_heartbeat_at INTEGER NOT NULL,
        metadata_json TEXT
      );
    `);
  }

  close(): void {
    if (this.db.isOpen) this.db.close();
  }

  private transact<T>(fn: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const value = fn();
      this.db.exec("COMMIT");
      return value;
    } catch (error) {
      try { this.db.exec("ROLLBACK"); } catch {}
      throw error;
    }
  }

  private leaseFromRow(row: SqlLeaseRow): LeaseRecord {
    return {
      version: "0.1",
      leaseId: row.lease_id,
      resourceId: row.resource_id,
      ownerId: row.owner_id,
      acquiredAt: iso(row.acquired_at),
      renewedAt: iso(row.renewed_at),
      expiresAt: iso(row.expires_at),
      revision: row.revision
    };
  }

  private workerFromRow(row: SqlWorkerRow): WorkerRecord {
    let capabilities: string[];
    let metadata: Record<string, string> | undefined;
    try {
      capabilities = JSON.parse(row.capabilities_json);
      metadata = row.metadata_json ? JSON.parse(row.metadata_json) : undefined;
    } catch {
      throw new Error(`Persistent worker record is corrupt: ${row.worker_id}`);
    }
    if (!Array.isArray(capabilities) || capabilities.some((item: unknown) => typeof item !== "string")) {
      throw new Error(`Persistent worker capabilities are corrupt: ${row.worker_id}`);
    }
    return {
      version: "0.1",
      workerId: row.worker_id,
      capabilities: capabilities.slice(),
      state: row.state,
      registeredAt: iso(row.registered_at),
      lastHeartbeatAt: iso(row.last_heartbeat_at),
      ...(metadata ? { metadata: { ...metadata } } : {})
    };
  }

  registerWorker(input: {
    workerId: string;
    capabilities: string[];
    metadata?: Record<string, string>;
  }): WorkerRecord {
    requireNonEmpty(input.workerId, "workerId");
    if (!Array.isArray(input.capabilities) || input.capabilities.some((item) => typeof item !== "string")) {
      throw new Error("Worker capabilities must be an array of strings");
    }
    const capabilities = Array.from(new Set(input.capabilities.slice())).sort();
    return this.transact(() => {
      const now = this.clock.nowMs();
      const existing = this.db.prepare("SELECT registered_at, metadata_json FROM workers WHERE worker_id = ?").get(input.workerId) as { registered_at?: number; metadata_json?: string | null } | undefined;
      const metadata = input.metadata
        ? JSON.stringify({ ...input.metadata })
        : existing?.metadata_json
          ? existing.metadata_json
          : null;
      this.db.prepare(`
        INSERT INTO workers (worker_id, capabilities_json, state, registered_at, last_heartbeat_at, metadata_json)
        VALUES (?, ?, 'active', ?, ?, ?)
        ON CONFLICT(worker_id) DO UPDATE SET
          capabilities_json = excluded.capabilities_json,
          state = 'active',
          last_heartbeat_at = excluded.last_heartbeat_at,
          metadata_json = excluded.metadata_json
      `).run(input.workerId, JSON.stringify(capabilities), existing?.registered_at ?? now, now, metadata);
      return this.workerFromRow(this.db.prepare("SELECT * FROM workers WHERE worker_id = ?").get(input.workerId) as SqlWorkerRow);
    });
  }

  heartbeat(workerId: string): WorkerRecord {
    requireNonEmpty(workerId, "workerId");
    return this.transact(() => {
      const now = this.clock.nowMs();
      const result = this.db.prepare("UPDATE workers SET state = 'active', last_heartbeat_at = ? WHERE worker_id = ?").run(now, workerId);
      if (!result.changes) throw new Error(`Unknown worker: ${workerId}`);
      return this.workerFromRow(this.db.prepare("SELECT * FROM workers WHERE worker_id = ?").get(workerId) as SqlWorkerRow);
    });
  }

  markWorkerOffline(workerId: string): WorkerRecord {
    requireNonEmpty(workerId, "workerId");
    return this.transact(() => {
      const now = this.clock.nowMs();
      const result = this.db.prepare("UPDATE workers SET state = 'offline', last_heartbeat_at = ? WHERE worker_id = ?").run(now, workerId);
      if (!result.changes) throw new Error(`Unknown worker: ${workerId}`);
      return this.workerFromRow(this.db.prepare("SELECT * FROM workers WHERE worker_id = ?").get(workerId) as SqlWorkerRow);
    });
  }

  getWorker(workerId: string): WorkerRecord | null {
    requireNonEmpty(workerId, "workerId");
    const row = this.db.prepare("SELECT * FROM workers WHERE worker_id = ?").get(workerId) as SqlWorkerRow | undefined;
    return row ? cloneWorker(this.workerFromRow(row)) : null;
  }

  listWorkers(): WorkerRecord[] {
    return (this.db.prepare("SELECT * FROM workers ORDER BY worker_id").all() as SqlWorkerRow[])
      .map((row) => cloneWorker(this.workerFromRow(row)));
  }

  acquire(resourceId: string, ownerId: string, ttlMs: number): LeaseAcquireResult {
    requireNonEmpty(resourceId, "resourceId");
    requireNonEmpty(ownerId, "ownerId");
    requireTtl(ttlMs);

    return this.transact(() => {
      const now = this.clock.nowMs();
      const existing = this.db.prepare("SELECT * FROM leases WHERE resource_id = ?").get(resourceId) as SqlLeaseRow | undefined;
      if (existing && existing.expires_at > now) {
        const current = this.leaseFromRow(existing);
        if (current.ownerId === ownerId) {
          this.db.prepare(`
            UPDATE leases
            SET renewed_at = ?, expires_at = ?, revision = revision + 1
            WHERE resource_id = ?
          `).run(now, now + ttlMs, resourceId);
          return { status: "renewed", lease: this.leaseFromRow(this.db.prepare("SELECT * FROM leases WHERE resource_id = ?").get(resourceId) as SqlLeaseRow) };
        }
        return { status: "busy", lease: cloneLease(current) };
      }

      if (existing) this.db.prepare("DELETE FROM leases WHERE resource_id = ?").run(resourceId);

      this.db.prepare(`
        INSERT INTO leases (resource_id, lease_id, owner_id, acquired_at, renewed_at, expires_at, revision)
        VALUES (?, '__pending__', ?, ?, ?, ?, 1)
      `).run(resourceId, ownerId, now, now, now + ttlMs);
      const leaseNumber = Number((this.db.prepare("SELECT last_insert_rowid() AS value").get() as { value: number }).value);
      const leaseId = `lease_${leaseNumber}`;
      this.db.prepare("UPDATE leases SET lease_id = ? WHERE lease_number = ?").run(leaseId, leaseNumber);
      return { status: "acquired", lease: this.leaseFromRow(this.db.prepare("SELECT * FROM leases WHERE resource_id = ?").get(resourceId) as SqlLeaseRow) };
    });
  }

  get(resourceId: string): LeaseRecord | null {
    requireNonEmpty(resourceId, "resourceId");
    const row = this.db.prepare("SELECT * FROM leases WHERE resource_id = ?").get(resourceId) as SqlLeaseRow | undefined;
    if (!row || row.expires_at <= this.clock.nowMs()) return null;
    return cloneLease(this.leaseFromRow(row));
  }

  renew(resourceId: string, leaseId: string, ownerId: string, ttlMs: number): LeaseRecord {
    requireNonEmpty(resourceId, "resourceId");
    requireNonEmpty(leaseId, "leaseId");
    requireNonEmpty(ownerId, "ownerId");
    requireTtl(ttlMs);

    return this.transact(() => {
      const now = this.clock.nowMs();
      const lease = this.db.prepare("SELECT * FROM leases WHERE resource_id = ?").get(resourceId) as SqlLeaseRow | undefined;
      if (!lease || lease.expires_at <= now) throw new Error("Lease is expired or missing");
      if (lease.lease_id !== leaseId || lease.owner_id !== ownerId) throw new Error("Lease ownership mismatch");
      this.db.prepare("UPDATE leases SET renewed_at = ?, expires_at = ?, revision = revision + 1 WHERE resource_id = ?").run(now, now + ttlMs, resourceId);
      return this.leaseFromRow(this.db.prepare("SELECT * FROM leases WHERE resource_id = ?").get(resourceId) as SqlLeaseRow);
    });
  }

  release(resourceId: string, leaseId: string, ownerId: string): boolean {
    requireNonEmpty(resourceId, "resourceId");
    requireNonEmpty(leaseId, "leaseId");
    requireNonEmpty(ownerId, "ownerId");

    return this.transact(() => {
      const lease = this.db.prepare("SELECT * FROM leases WHERE resource_id = ?").get(resourceId) as SqlLeaseRow | undefined;
      if (!lease) return false;
      if (lease.lease_id !== leaseId || lease.owner_id !== ownerId) throw new Error("Lease ownership mismatch");
      this.db.prepare("DELETE FROM leases WHERE resource_id = ?").run(resourceId);
      return true;
    });
  }

  assertOwned(resourceId: string, leaseId: string, ownerId: string): LeaseRecord {
    const lease = this.get(resourceId);
    if (!lease || lease.leaseId !== leaseId || lease.ownerId !== ownerId) {
      throw new Error("Lease is not currently owned by caller");
    }
    return lease;
  }

  reapExpired(): LeaseRecord[] {
    return this.transact(() => {
      const now = this.clock.nowMs();
      const rows = this.db.prepare("SELECT * FROM leases WHERE expires_at <= ? ORDER BY resource_id").all(now) as SqlLeaseRow[];
      this.db.prepare("DELETE FROM leases WHERE expires_at <= ?").run(now);
      return rows.map((row) => cloneLease(this.leaseFromRow(row)));
    });
  }

  listLeases(): LeaseRecord[] {
    this.reapExpired();
    return (this.db.prepare("SELECT * FROM leases ORDER BY resource_id").all() as SqlLeaseRow[])
      .map((row) => cloneLease(this.leaseFromRow(row)));
  }
}
