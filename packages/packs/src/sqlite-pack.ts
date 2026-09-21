import { CapabilityRegistry } from "../../capabilities/src/registry";
import { Capability, CapabilityReceipt, EvidenceRef, Verifier } from "../../core/src/types";
const { DatabaseSync } = require("node:sqlite");
const fs = require("fs");
const path = require("path");

export interface SQLiteQueryInput {
  databasePath: string;
  sql: string;
  params?: unknown[];
  maxRows?: number;
  expected?: {
    minRows?: number;
    row?: Record<string, unknown>;
  };
}

export interface SQLiteUpsertInput {
  databasePath: string;
  table: string;
  keyColumn: string;
  row: Record<string, unknown>;
}

const MAX_SQL_LENGTH = 20_000;
const MAX_PARAMS = 50;
const MAX_ROWS = 500;
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

function validDatabasePath(databasePath: unknown): databasePath is string {
  if (typeof databasePath !== "string" || databasePath.length === 0 || databasePath.length > 4096) return false;
  const resolved = path.resolve(databasePath);
  if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) return false;
  return true;
}

function validSql(sql: unknown): sql is string {
  return typeof sql === "string" &&
    sql.length > 0 &&
    sql.length <= MAX_SQL_LENGTH &&
    !sql.includes("\u0000") &&
    !sql.includes(";") &&
    /^\s*select\b/i.test(sql);
}

function validParams(params: unknown[]): boolean {
  if (params.length > MAX_PARAMS) return false;
  return params.every(value =>
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "bigint" ||
    value instanceof Uint8Array
  );
}

function maxRows(input: SQLiteQueryInput): number {
  const value = input.maxRows ?? 100;
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_ROWS) throw new Error(`maxRows must be an integer from 1 to ${MAX_ROWS}`);
  return value;
}

function openReadOnly(databasePath: string): any {
  return new DatabaseSync(path.resolve(databasePath), {
    readOnly: true,
    enableForeignKeyConstraints: true
  });
}

function executeQuery(input: SQLiteQueryInput): { rows: Record<string, unknown>[]; truncated: boolean } {
  if (!validDatabasePath(input.databasePath)) throw new Error("databasePath is invalid");
  if (!validSql(input.sql)) throw new Error("sql must be a single SELECT statement without a semicolon");
  const params = input.params ?? [];
  if (!Array.isArray(params) || !validParams(params)) throw new Error(`params must contain at most ${MAX_PARAMS} supported values`);
  const limit = maxRows(input);
  const db = openReadOnly(input.databasePath);
  try {
    const statement = db.prepare(`SELECT * FROM (${input.sql}) AS workproof_query LIMIT ?`);
    const rows = statement.all(...params, limit + 1) as Record<string, unknown>[];
    const truncated = rows.length > limit;
    return { rows: truncated ? rows.slice(0, limit) : rows, truncated };
  } finally {
    db.close();
  }
}

function evidence(databasePath: string, kind: string, metadata: Record<string, unknown>): EvidenceRef {
  return {
    id: `sqlite:${kind}:${path.resolve(databasePath)}`,
    kind,
    uri: path.resolve(databasePath),
    observedAt: new Date().toISOString(),
    metadata
  };
}

class SQLiteQueryCapability implements Capability {
  name = "pack.database.sqlite.query";
  version = "0.1.0";
  operations = ["query"];
  riskClass = "read" as const;

  async execute(request: { operation: string; input: unknown }): Promise<CapabilityReceipt> {
    const input = request.input as SQLiteQueryInput;
    try {
      const result = executeQuery(input);
      return {
        status: "accepted",
        data: { rows: result.rows, truncated: result.truncated },
        externalEffectId: `sqlite:query:${path.resolve(input.databasePath)}`,
        evidence: [
          evidence(input.databasePath, "sqlite-query", {
            rowCount: result.rows.length,
            truncated: result.truncated,
            sql: input.sql.slice(0, 1000)
          })
        ]
      };
    } catch (error) {
      return { status: "rejected", data: { reason: String(error) } };
    }
  }
}

class SQLiteQueryVerifier implements Verifier {
  name = "pack.database.sqlite.query";

  async verify(ctx: { work: any; criterion: any }) {
    const input = ctx.work.contract.inputs as SQLiteQueryInput;
    try {
      const result = executeQuery(input);
      const expected = input.expected ?? {};
      const minRows = expected.minRows ?? 0;
      if (!Number.isSafeInteger(minRows) || minRows < 0 || minRows > MAX_ROWS) {
        return { id: ctx.criterion.id, criterion: ctx.criterion.description, passed: false, details: "Invalid expected.minRows", evidence: [] };
      }

      const rowMatches = expected.row
        ? result.rows.some(row => Object.keys(expected.row as Record<string, unknown>).every(key =>
            JSON.stringify(row[key]) === JSON.stringify((expected.row as Record<string, unknown>)[key])
          ))
        : true;

      const passed = result.rows.length >= minRows && rowMatches;
      return {
        id: ctx.criterion.id,
        criterion: ctx.criterion.description,
        passed,
        details: `rows=${result.rows.length}; minRows=${minRows}; rowMatches=${rowMatches}; truncated=${result.truncated}`,
        evidence: passed
          ? [evidence(input.databasePath, "sqlite-verification", { rowCount: result.rows.length, minRows, truncated: result.truncated })]
          : []
      };
    } catch (error) {
      return { id: ctx.criterion.id, criterion: ctx.criterion.description, passed: false, details: String(error), evidence: [] };
    }
  }
}

function quotedIdentifier(value: string): string {
  if (!IDENTIFIER.test(value)) throw new Error("SQLite identifiers must match [A-Za-z_][A-Za-z0-9_]*");
  return `"${value}"`;
}

function executeUpsert(input: SQLiteUpsertInput): { changes: number; row: Record<string, unknown> } {
  if (!validDatabasePath(input.databasePath)) throw new Error("databasePath is invalid");
  if (!input || !IDENTIFIER.test(input.table) || !IDENTIFIER.test(input.keyColumn)) throw new Error("table and keyColumn must be safe SQLite identifiers");
  if (!input.row || typeof input.row !== "object" || Array.isArray(input.row)) throw new Error("row must be an object");
  const columns = Object.keys(input.row).sort();
  if (columns.length === 0 || columns.length > MAX_PARAMS || !columns.every(column => IDENTIFIER.test(column))) {
    throw new Error(`row must contain 1-${MAX_PARAMS} safe SQLite columns`);
  }
  if (!Object.prototype.hasOwnProperty.call(input.row, input.keyColumn)) throw new Error("row must contain the keyColumn");
  const values = columns.map(column => (input.row as Record<string, unknown>)[column]);
  if (!validParams(values)) throw new Error(`row values must contain at most ${MAX_PARAMS} supported values`);

  const columnSql = columns.map(quotedIdentifier).join(", ");
  const placeholders = columns.map(() => "?").join(", ");
  const updates = columns.filter(column => column !== input.keyColumn)
    .map(column => `${quotedIdentifier(column)} = excluded.${quotedIdentifier(column)}`);
  const conflictSql = updates.length ? `DO UPDATE SET ${updates.join(", ")}` : "DO NOTHING";

  const db = new DatabaseSync(path.resolve(input.databasePath), {
    enableForeignKeyConstraints: true
  });
  try {
    const statement = db.prepare(`INSERT INTO ${quotedIdentifier(input.table)} (${columnSql}) VALUES (${placeholders}) ON CONFLICT (${quotedIdentifier(input.keyColumn)}) ${conflictSql}`);
    const result = statement.run(...values);
    return { changes: Number(result.changes ?? 0), row: input.row };
  } finally {
    db.close();
  }
}

class SQLiteUpsertCapability implements Capability {
  name = "pack.database.sqlite.upsert";
  version = "0.1.0";
  operations = ["upsert"];
  riskClass = "local_write" as const;

  async execute(request: { operation: string; input: unknown }): Promise<CapabilityReceipt> {
    const input = request.input as SQLiteUpsertInput;
    try {
      const result = executeUpsert(input);
      return {
        status: "accepted",
        data: result,
        externalEffectId: `sqlite:upsert:${path.resolve(input.databasePath)}:${input.table}:${input.keyColumn}`,
        evidence: [evidence(input.databasePath, "sqlite-upsert", {
          table: input.table,
          keyColumn: input.keyColumn,
          changes: result.changes
        })]
      };
    } catch (error) {
      return { status: "rejected", data: { reason: String(error) } };
    }
  }
}

class SQLiteUpsertVerifier implements Verifier {
  name = "pack.database.sqlite.upsert";

  async verify(ctx: { work: any; criterion: any }) {
    const input = ctx.work.contract.inputs as SQLiteUpsertInput;
    try {
      if (!validDatabasePath(input.databasePath) || !IDENTIFIER.test(input.table) || !IDENTIFIER.test(input.keyColumn)) {
        return { id: ctx.criterion.id, criterion: ctx.criterion.description, passed: false, details: "Invalid SQLite upsert inputs", evidence: [] };
      }
      const keyValue = input.row?.[input.keyColumn];
      const query: SQLiteQueryInput = {
        databasePath: input.databasePath,
        sql: `SELECT * FROM ${quotedIdentifier(input.table)} WHERE ${quotedIdentifier(input.keyColumn)} = ?`,
        params: [keyValue],
        maxRows: 1
      };
      const result = executeQuery(query);
      if (result.rows.length !== 1) {
        return { id: ctx.criterion.id, criterion: ctx.criterion.description, passed: false, details: `Expected one row, got ${result.rows.length}`, evidence: [] };
      }
      const row = result.rows[0];
      const rowMatches = Object.keys(input.row).every(key => JSON.stringify(row[key]) === JSON.stringify(input.row[key]));
      const passed = rowMatches;
      return {
        id: ctx.criterion.id,
        criterion: ctx.criterion.description,
        passed,
        details: `rowMatches=${rowMatches}; columns=${Object.keys(input.row).length}`,
        evidence: passed ? [evidence(input.databasePath, "sqlite-upsert-verification", {
          table: input.table,
          keyColumn: input.keyColumn
        })] : []
      };
    } catch (error) {
      return { id: ctx.criterion.id, criterion: ctx.criterion.description, passed: false, details: String(error), evidence: [] };
    }
  }
}

export function registerSQLitePack(
  registry: CapabilityRegistry,
  verification: { register(v: Verifier): void }
): void {
  registry.register(new SQLiteQueryCapability());
  registry.register(new SQLiteUpsertCapability());
  verification.register(new SQLiteQueryVerifier());
  verification.register(new SQLiteUpsertVerifier());
}
