import type {
  CapabilityReceipt,
  EvidenceRef,
  SuccessCriterion,
  VerificationResult,
  WorkContract,
  WorkObject
} from "../../core/src/types";
import type { WorkStep } from "../../runtime/src/engine";

export type { CapabilityReceipt, EvidenceRef, SuccessCriterion, VerificationResult, WorkContract, WorkObject, WorkStep };

export interface ProofReference {
  digest: string;
  workId: string;
  uri?: string;
}

export interface WorkDispatchRequest {
  objective: string;
  inputs?: Record<string, unknown>;
  constraints?: Record<string, unknown>;
  success?: SuccessCriterion[];
  deliverables?: string[];
  riskClass?: WorkContract["riskClass"];
  approvalRequired?: boolean;
  steps?: WorkStep[];
  metadata?: Record<string, unknown>;
}

export interface ControlPlaneClientOptions {
  baseUrl: string;
  token?: string;
}

export interface ControlMutationOptions {
  idempotencyKey?: string;
}

export interface CapabilityInfo {
  name: string;
  version: string;
  operations: string[];
  riskClass: string;
}

export interface WorkSummary {
  id: string;
  objective: string;
  status: string;
  riskClass?: string;
  approvalRequired: boolean;
  createdAt: string;
  updatedAt: string;
  a2aContextId?: string;
}

export interface WorkListPage {
  items: WorkSummary[];
  total: number;
  offset: number;
}

function normalizeBaseUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Control plane URL must use HTTP or HTTPS");
  return url.toString().replace(/\/$/, "");
}

export function serializeWorkObject(work: WorkObject): string {
  return JSON.stringify(work);
}

export function parseWorkObject(raw: string): WorkObject {
  const value = JSON.parse(raw);
  if (
    !value ||
    typeof value !== "object" ||
    typeof value.id !== "string" ||
    !value.contract ||
    typeof value.contract !== "object" ||
    typeof value.status !== "string" ||
    !Array.isArray(value.events) ||
    !Array.isArray(value.effects) ||
    !Array.isArray(value.artifacts)
  ) {
    throw new Error("Invalid Work Object");
  }
  return value as WorkObject;
}

async function request(
  baseUrl: string,
  token: string | undefined,
  method: string,
  path: string,
  body?: unknown,
  idempotencyKey?: string
): Promise<any> {
  if (idempotencyKey !== undefined && !/^[A-Za-z0-9._~-]{1,200}$/.test(idempotencyKey)) {
    throw new Error("Invalid idempotency key");
  }
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const raw = await response.text();
  let data: any;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    throw new Error(`Control plane returned invalid JSON (HTTP ${response.status})`);
  }
  if (!response.ok) throw new Error(data?.error ? String(data.error) : `Control plane request failed (HTTP ${response.status})`);
  return data;
}

export class ControlPlaneClient {
  private readonly baseUrl: string;
  private readonly token?: string;

  constructor(options: ControlPlaneClientOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.token = options.token;
  }

  async listWorkPage(options: { limit?: number; offset?: number; status?: string; contextId?: string } = {}): Promise<WorkListPage> {
    const limit = options.limit ?? 100;
    const offset = options.offset ?? 0;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error("Invalid work list limit");
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1000000) throw new Error("Invalid work list offset");
    const query = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (options.status) query.set("status", options.status);
    if (options.contextId) query.set("contextId", options.contextId);
    const data = await request(this.baseUrl, this.token, "GET", "/v1/work?" + query.toString());
    if (!Array.isArray(data?.work) || !Number.isSafeInteger(data?.total)) {
      throw new Error("Control plane returned an invalid work list");
    }
    const items = data.work.map((item: any) => ({
      id: String(item?.id ?? ""),
      objective: String(item?.objective ?? ""),
      status: String(item?.status ?? ""),
      ...(item?.riskClass === undefined ? {} : { riskClass: String(item.riskClass) }),
      approvalRequired: Boolean(item?.approvalRequired),
      createdAt: String(item?.createdAt ?? ""),
      updatedAt: String(item?.updatedAt ?? ""),
      ...(typeof item?.a2aContextId === "string" ? { a2aContextId: item.a2aContextId } : {})
    }));
    return { items, total: data.total, offset: Number(data.offset ?? offset) };
  }

  async listWork(options: { limit?: number; status?: string; contextId?: string } = {}): Promise<WorkSummary[]> {
    return (await this.listWorkPage({ ...options, limit: options.limit ?? 100, offset: 0 })).items;
  }
  async getWork(workId: string): Promise<WorkObject> {
    if (!/^[A-Za-z0-9._-]+$/.test(workId)) throw new Error("Invalid work id");
    return parseWorkObject(JSON.stringify((await request(this.baseUrl, this.token, "GET", `/v1/work/${workId}`)).work));
  }

  async listCapabilities(): Promise<CapabilityInfo[]> {
    const data = await request(this.baseUrl, this.token, "GET", "/v1/capabilities");
    if (!Array.isArray(data?.capabilities)) throw new Error("Control plane returned an invalid capability list");
    return data.capabilities.map((item: any) => ({
      name: String(item?.name ?? ""),
      version: String(item?.version ?? ""),
      operations: Array.isArray(item?.operations) ? item.operations.map((value: unknown) => String(value)).sort() : [],
      riskClass: String(item?.riskClass ?? "")
    }));
  }

  async dispatch(input: WorkDispatchRequest, options: ControlMutationOptions = {}): Promise<WorkObject> {
    if (!input || typeof input.objective !== "string" || !input.objective.trim()) throw new Error("Dispatch objective is required");
    return parseWorkObject(JSON.stringify((await request(this.baseUrl, this.token, "POST", "/v1/work/dispatch", input, options.idempotencyKey)).work));
  }

  async cancel(workId: string, options: ControlMutationOptions = {}): Promise<WorkObject> {
    if (!/^[A-Za-z0-9._-]+$/.test(workId)) throw new Error("Invalid work id");
    return parseWorkObject(JSON.stringify((await request(this.baseUrl, this.token, "POST", `/v1/work/${workId}/cancel`, {}, options.idempotencyKey)).work));
  }

  async resume(workId: string, options: ControlMutationOptions = {}): Promise<WorkObject> {
    if (!/^[A-Za-z0-9._-]+$/.test(workId)) throw new Error("Invalid work id");
    return parseWorkObject(JSON.stringify((await request(this.baseUrl, this.token, "POST", `/v1/work/${workId}/resume`, {}, options.idempotencyKey)).work));
  }
}
