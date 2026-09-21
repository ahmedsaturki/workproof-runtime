const { DatabaseSync } = require("node:sqlite");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return "{" + Object.keys(record).sort().map((key) => JSON.stringify(key) + ":" + canonical(record[key])).join(",") + "}";
  }
  return JSON.stringify(value);
}

export function fingerprintControlRequest(operation: string, input: unknown): string {
  return crypto.createHash("sha256").update(canonical({ operation, input }), "utf8").digest("hex");
}

export interface ControlIdempotencyRecord {
  key: string;
  operation: string;
  fingerprint: string;
  state: "pending" | "completed";
  statusCode?: number;
  responseJson?: string;
  requestId: string;
  createdAt: string;
  updatedAt: string;
}

export type IdempotencyClaim =
  | { status: "claimed"; record: ControlIdempotencyRecord }
  | { status: "replay"; record: ControlIdempotencyRecord }
  | { status: "conflict"; record: ControlIdempotencyRecord }
  | { status: "pending"; record: ControlIdempotencyRecord };

function requireKey(key: string): string {
  if (typeof key !== "string" || !/^[A-Za-z0-9._~-]{1,200}$/.test(key)) {
    throw new Error("Invalid Idempotency-Key");
  }
  return key;
}

function rowToRecord(row: any): ControlIdempotencyRecord {
  return {
    key: row.key,
    operation: row.operation,
    fingerprint: row.fingerprint,
    state: row.state,
    ...(row.status_code == null ? {} : { statusCode: Number(row.status_code) }),
    ...(row.response_json == null ? {} : { responseJson: row.response_json }),
    requestId: row.request_id,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

export class ControlIdempotencyLedger {
  private readonly db: any;

  constructor(dbPath: string) {
    if (typeof dbPath !== "string" || !dbPath.trim()) throw new Error("Idempotency database path is required");
    if (dbPath !== ":memory:") {
      fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
    }
    this.db = new DatabaseSync(dbPath, { timeout: 1000 });
    if (dbPath !== ":memory:") {
      try { fs.chmodSync(dbPath, 0o600); } catch {}
    }
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS control_requests (
        key TEXT PRIMARY KEY,
        operation TEXT NOT NULL,
        fingerprint TEXT NOT NULL,
        state TEXT NOT NULL CHECK (state IN ('pending', 'completed')),
        status_code INTEGER,
        response_json TEXT,
        request_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
  }

  close(): void {
    if (this.db.isOpen) this.db.close();
  }

  private transact<T>(fn: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      try { this.db.exec("ROLLBACK"); } catch {}
      throw error;
    }
  }

  claim(key: string, operation: string, fingerprint: string, requestId: string): IdempotencyClaim {
    requireKey(key);
    if (!operation.trim()) throw new Error("Idempotency operation is required");
    if (!/^[0-9a-f]{64}$/.test(fingerprint)) throw new Error("Invalid idempotency fingerprint");
    if (!/^[0-9a-f]{16}$/.test(requestId)) throw new Error("Invalid request id");

    return this.transact(() => {
      const existing = this.db.prepare("SELECT * FROM control_requests WHERE key = ?").get(key) as any;
      if (existing) {
        const record = rowToRecord(existing);
        if (record.operation !== operation || record.fingerprint !== fingerprint) return { status: "conflict", record };
        if (record.state === "completed") return { status: "replay", record };
        return { status: "pending", record };
      }
      const now = Date.now();
      this.db.prepare(`
        INSERT INTO control_requests
          (key, operation, fingerprint, state, request_id, created_at, updated_at)
        VALUES (?, ?, ?, 'pending', ?, ?, ?)
      `).run(key, operation, fingerprint, requestId, now, now);
      return {
        status: "claimed",
        record: {
          key,
          operation,
          fingerprint,
          state: "pending",
          requestId,
          createdAt: new Date(now).toISOString(),
          updatedAt: new Date(now).toISOString()
        }
      };
    });
  }

  complete(key: string, statusCode: number, response: Record<string, unknown>): ControlIdempotencyRecord {
    requireKey(key);
    if (!Number.isInteger(statusCode) || statusCode < 100 || statusCode > 599) throw new Error("Invalid idempotency status code");
    const payload = JSON.stringify(response);
    return this.transact(() => {
      const row = this.db.prepare("SELECT * FROM control_requests WHERE key = ?").get(key) as any;
      if (!row) throw new Error("Unknown idempotency key");
      if (row.state === "completed") return rowToRecord(row);
      const now = Date.now();
      this.db.prepare(`
        UPDATE control_requests
        SET state = 'completed', status_code = ?, response_json = ?, updated_at = ?
        WHERE key = ? AND state = 'pending'
      `).run(statusCode, payload, now, key);
      const saved = this.db.prepare("SELECT * FROM control_requests WHERE key = ?").get(key) as any;
      return rowToRecord(saved);
    });
  }

  get(key: string): ControlIdempotencyRecord | null {
    requireKey(key);
    const row = this.db.prepare("SELECT * FROM control_requests WHERE key = ?").get(key) as any;
    return row ? rowToRecord(row) : null;
  }
}

export function parseIdempotencyResponse(record: ControlIdempotencyRecord): Record<string, unknown> {
  if (record.state !== "completed" || typeof record.responseJson !== "string") {
    throw new Error("Idempotency record is not completed");
  }
  const value = JSON.parse(record.responseJson);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Stored idempotency response is corrupt");
  return value as Record<string, unknown>;
}
