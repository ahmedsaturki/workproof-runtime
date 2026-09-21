const crypto = require("crypto");
import { CapabilityRegistry } from "../../capabilities/src/registry";
import { Capability, CapabilityReceipt, EvidenceRef, Verifier } from "../../core/src/types";
const fs = require("fs");
const path = require("path");

export interface DataTransformInput {
  inputPath: string;
  outputPath: string;
  filter?: {
    field: string;
    equals: string | number | boolean | null;
  };
  select?: string[];
  sortBy?: {
    field: string;
    direction: "asc" | "desc";
  };
  limit?: number;
}

const MAX_INPUT_BYTES = 2 * 1024 * 1024;
const MAX_INPUT_DEPTH = 20;
const MAX_INPUT_ITEMS = 10_000;
const MAX_OUTPUT_ITEMS = 500;
const MAX_SELECT_FIELDS = 50;
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

function validPath(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 4096;
}

function validField(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 128 && IDENTIFIER.test(value);
}

function primitive(value: unknown): value is string | number | boolean | null {
  return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function scan(value: unknown, depth = 0, seen = { items: 0 }): void {
  if (depth > MAX_INPUT_DEPTH) throw new Error(`input exceeds maximum depth ${MAX_INPUT_DEPTH}`);
  if (value && typeof value === "object") {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      seen.items += 1;
      if (seen.items > MAX_INPUT_ITEMS) throw new Error(`input exceeds maximum item count ${MAX_INPUT_ITEMS}`);
      scan((value as Record<string, unknown>)[key], depth + 1, seen);
    }
  }
}

function loadRoot(inputPath: string): unknown[] {
  if (!validPath(inputPath)) throw new Error("inputPath is invalid");
  const resolved = path.resolve(inputPath);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) throw new Error("inputPath must reference a file");
  const bytes = fs.statSync(resolved).size;
  if (bytes > MAX_INPUT_BYTES) throw new Error(`input exceeds maximum size ${MAX_INPUT_BYTES}`);
  const value = JSON.parse(fs.readFileSync(resolved, "utf8"));
  scan(value);
  if (!Array.isArray(value)) throw new Error("input JSON root must be an array");
  if (value.length > MAX_INPUT_ITEMS) throw new Error(`input exceeds maximum row count ${MAX_INPUT_ITEMS}`);
  if (!value.every(item => item && typeof item === "object" && !Array.isArray(item))) throw new Error("input rows must be JSON objects");
  return value as Record<string, unknown>[];
}

function validateSpec(input: DataTransformInput): void {
  if (!validPath(input.outputPath)) throw new Error("outputPath is invalid");
  if (input.filter) {
    if (!validField(input.filter.field) || !primitive(input.filter.equals)) throw new Error("filter must declare a safe field and primitive equals value");
  }
  if (input.select) {
    if (!Array.isArray(input.select) || input.select.length < 1 || input.select.length > MAX_SELECT_FIELDS || !input.select.every(validField)) {
      throw new Error(`select must contain 1-${MAX_SELECT_FIELDS} safe fields`);
    }
  }
  if (input.sortBy) {
    if (!validField(input.sortBy.field) || !["asc", "desc"].includes(input.sortBy.direction)) throw new Error("sortBy is invalid");
  }
  if (input.limit !== undefined && (!Number.isSafeInteger(input.limit) || input.limit < 1 || input.limit > MAX_OUTPUT_ITEMS)) {
    throw new Error(`limit must be an integer from 1 to ${MAX_OUTPUT_ITEMS}`);
  }
}

function project(row: Record<string, unknown>, fields?: string[]): Record<string, unknown> {
  if (!fields) return { ...row };
  const output: Record<string, unknown> = {};
  for (const field of fields) if (Object.prototype.hasOwnProperty.call(row, field)) output[field] = row[field];
  return output;
}

function comparePrimitive(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  if (typeof a === "number" && typeof b === "number") return a < b ? -1 : 1;
  const left = String(a);
  const right = String(b);
  return left < right ? -1 : 1;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>).sort().map(key => JSON.stringify(key) + ":" + canonical((value as Record<string, unknown>)[key])).join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value: unknown): string {
  return crypto.createHash("sha256").update(canonical(value), "utf8").digest("hex");
}

function transformRows(input: DataTransformInput): {
  rows: Record<string, unknown>[];
  inputRows: number;
  outputRows: number;
  truncated: boolean;
} {
  validateSpec(input);
  const source = loadRoot(input.inputPath);
  let rows = source.slice() as Record<string, unknown>[];
  if (input.filter) rows = rows.filter(row => JSON.stringify(row[input.filter!.field]) === JSON.stringify(input.filter!.equals));
  if (input.sortBy) {
    const field = input.sortBy.field;
    const direction = input.sortBy.direction === "asc" ? 1 : -1;
    rows = rows.map((row, index) => ({ row, index })).sort((left, right) => {
      const compared = comparePrimitive(left.row[field], right.row[field]);
      return compared !== 0 ? compared * direction : left.index - right.index;
    }).map(item => item.row);
  }
  const limit = input.limit ?? MAX_OUTPUT_ITEMS;
  const truncated = rows.length > limit;
  rows = rows.slice(0, limit).map(row => project(row, input.select));
  return { rows, inputRows: source.length, outputRows: rows.length, truncated };
}

function writeOutput(outputPath: string, value: unknown): void {
  const resolved = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function evidence(input: DataTransformInput, kind: string, metadata: Record<string, string | number | boolean>): EvidenceRef {
  return {
    id: `transform:${kind}:${path.resolve(input.outputPath)}`,
    kind,
    uri: path.resolve(input.outputPath),
    observedAt: new Date().toISOString(),
    metadata
  };
}

class DataTransformCapability implements Capability {
  name = "pack.transform.json";
  version = "0.1.0";
  operations = ["transform"];
  riskClass = "local_write" as const;

  async execute(request: { operation: string; input: unknown }): Promise<CapabilityReceipt> {
    const input = request.input as DataTransformInput;
    try {
      const result = transformRows(input);
      writeOutput(input.outputPath, result.rows);
      return {
        status: "accepted",
        data: { inputRows: result.inputRows, outputRows: result.outputRows, truncated: result.truncated, outputDigest: digest(result.rows) },
        externalEffectId: `transform:${path.resolve(input.outputPath)}`,
        evidence: [evidence(input, "transform-output", {
          inputRows: result.inputRows,
          outputRows: result.outputRows,
          truncated: result.truncated,
          outputDigest: digest(result.rows)
        })]
      };
    } catch (error) {
      return { status: "rejected", data: { reason: String(error) } };
    }
  }
}

class DataTransformVerifier implements Verifier {
  name = "pack.transform.json";

  async verify(ctx: { work: any; criterion: any }) {
    const input = ctx.work.contract.inputs as DataTransformInput;
    try {
      validateSpec(input);
      const expected = transformRows(input);
      const outputPath = path.resolve(input.outputPath);
      if (!fs.existsSync(outputPath)) {
        return { id: ctx.criterion.id, criterion: ctx.criterion.description, passed: false, details: "output artifact missing", evidence: [] };
      }
      const actual = JSON.parse(fs.readFileSync(outputPath, "utf8"));
      const actualDigest = digest(actual);
      const expectedDigest = digest(expected.rows);
      const passed = Array.isArray(actual) && actualDigest === expectedDigest;
      return {
        id: ctx.criterion.id,
        criterion: ctx.criterion.description,
        passed,
        details: `expectedDigest=${expectedDigest}; actualDigest=${actualDigest}; outputRows=${Array.isArray(actual) ? actual.length : -1}`,
        evidence: passed ? [evidence(input, "transform-verification", {
          outputRows: expected.outputRows,
          truncated: expected.truncated,
          outputDigest: actualDigest
        })] : []
      };
    } catch (error) {
      return { id: ctx.criterion.id, criterion: ctx.criterion.description, passed: false, details: String(error), evidence: [] };
    }
  }
}

export function registerDataTransformPack(
  registry: CapabilityRegistry,
  verification: { register(v: Verifier): void }
): void {
  registry.register(new DataTransformCapability());
  verification.register(new DataTransformVerifier());
}
