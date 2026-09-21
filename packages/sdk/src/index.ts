import type {
  CapabilityReceipt,
  EvidenceRef,
  SuccessCriterion,
  VerificationResult,
  WorkContract,
  WorkObject
} from "../../core/src/types";

export type { CapabilityReceipt, EvidenceRef, SuccessCriterion, VerificationResult, WorkContract, WorkObject };

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
  metadata?: Record<string, unknown>;
}

export interface ControlPlaneClientOptions {
  baseUrl: string;
  token?: string;
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

async function request(baseUrl: string, token: string | undefined, method: string, path: string, body?: unknown): Promise<any> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(token ? { authorization: `Bearer ${token}` } : {})
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

  async getWork(workId: string): Promise<WorkObject> {
    if (!/^[A-Za-z0-9._-]+$/.test(workId)) throw new Error("Invalid work id");
    return parseWorkObject(JSON.stringify((await request(this.baseUrl, this.token, "GET", `/v1/work/${workId}`)).work));
  }

  async dispatch(input: WorkDispatchRequest): Promise<WorkObject> {
    if (!input || typeof input.objective !== "string" || !input.objective.trim()) throw new Error("Dispatch objective is required");
    return parseWorkObject(JSON.stringify((await request(this.baseUrl, this.token, "POST", "/v1/work/dispatch", input)).work));
  }

  async cancel(workId: string): Promise<WorkObject> {
    if (!/^[A-Za-z0-9._-]+$/.test(workId)) throw new Error("Invalid work id");
    return parseWorkObject(JSON.stringify((await request(this.baseUrl, this.token, "POST", `/v1/work/${workId}/cancel`, {})).work));
  }

  async resume(workId: string): Promise<WorkObject> {
    if (!/^[A-Za-z0-9._-]+$/.test(workId)) throw new Error("Invalid work id");
    return parseWorkObject(JSON.stringify((await request(this.baseUrl, this.token, "POST", `/v1/work/${workId}/resume`, {})).work));
  }
}
