const { URL } = require("url");

export interface OtlpLogExporterOptions {
  endpoint: string;
  headers?: Record<string, string>;
  serviceName?: string;
  serviceVersion?: string;
}

export interface TelemetryEntry {
  [key: string]: unknown;
}

const SAFE_KEYS = [
  "requestId",
  "method",
  "path",
  "permission",
  "allowed",
  "reason",
  "credentialId",
  "action",
  "workId",
  "status",
  "idempotencyKey",
  "at"
];

function normalizeEndpoint(value: string, appendLogsPath: boolean): string {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("OTLP endpoint must use HTTP or HTTPS");
  }
  if (appendLogsPath && !url.pathname.endsWith("/v1/logs")) {
    url.pathname = url.pathname.replace(/\/$/, "") + "/v1/logs";
  }
  return url.toString();
}

function parseHeaders(raw?: string): Record<string, string> {
  if (!raw?.trim()) return {};
  const headers: Record<string, string> = {};
  for (const item of raw.split(",")) {
    const index = item.indexOf("=");
    if (index <= 0) continue;
    const key = item.slice(0, index).trim();
    const value = item.slice(index + 1).trim();
    if (!/^[A-Za-z0-9._-]+$/.test(key)) continue;
    if (value.length > 2000) continue;
    headers[key] = value;
  }
  return headers;
}

function otlpValue(value: unknown): Record<string, unknown> | null {
  if (typeof value === "string") return { stringValue: value.slice(0, 1000) };
  if (typeof value === "boolean") return { boolValue: value };
  if (typeof value === "number" && Number.isSafeInteger(value)) return { intValue: String(value) };
  if (typeof value === "number" && Number.isFinite(value)) return { doubleValue: value };
  return null;
}

function timestampToNano(value: unknown): string {
  if (typeof value === "string") {
    const millis = Date.parse(value);
    if (Number.isFinite(millis)) return String(BigInt(Math.trunc(millis)) * 1000000n);
  }
  return String(BigInt(Date.now()) * 1000000n);
}

export class OtlpLogExporter {
  private readonly endpoint: string;
  private readonly headers: Record<string, string>;
  private readonly serviceName: string;
  private readonly serviceVersion: string;

  constructor(options: OtlpLogExporterOptions) {
    this.endpoint = normalizeEndpoint(options.endpoint, false);
    this.headers = { "content-type": "application/json", ...(options.headers ?? {}) };
    this.serviceName = options.serviceName ?? "workproof-runtime";
    this.serviceVersion = options.serviceVersion ?? "unknown";
  }

  async emit(entry: TelemetryEntry): Promise<boolean> {
    try {
      const attributes = SAFE_KEYS
        .filter((key) => key !== "at" && Object.prototype.hasOwnProperty.call(entry, key))
        .map((key) => {
          const value = otlpValue(entry[key]);
          return value ? { key: "workproof." + key, value } : null;
        })
        .filter((value): value is { key: string; value: Record<string, unknown> } => value !== null);

      const body = {
        resourceLogs: [{
          resource: {
            attributes: [
              { key: "service.name", value: { stringValue: this.serviceName } },
              { key: "service.version", value: { stringValue: this.serviceVersion } }
            ]
          },
          scopeLogs: [{
            scope: {
              name: "workproof-runtime.telemetry",
              version: this.serviceVersion
            },
            logRecords: [{
              timeUnixNano: timestampToNano(entry.at),
              observedTimeUnixNano: String(BigInt(Date.now()) * 1000000n),
              severityNumber: entry.action === "error" ? 17 : (entry.allowed === false ? 13 : 9),
              severityText: entry.action === "error" ? "ERROR" : (entry.allowed === false ? "WARN" : "INFO"),
              eventName: "workproof.control.audit",
              body: { stringValue: "WorkProof control-plane audit event" },
              attributes
            }]
          }]
        }]
      };

      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(body)
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export function createOtlpLogExporterFromEnv(args: {
  serviceName: string;
  serviceVersion: string;
  env?: Record<string, string | undefined>;
}): OtlpLogExporter | undefined {
  const env = args.env ?? process.env;
  const signalEndpoint = env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT;
  const baseEndpoint = env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const protocol = (env.OTEL_EXPORTER_OTLP_LOGS_PROTOCOL ?? env.OTEL_EXPORTER_OTLP_PROTOCOL ?? "http/json").trim().toLowerCase();
  if (protocol !== "http/json") {
    throw new Error("WorkProof OTLP exporter currently supports only http/json");
  }
  const rawEndpoint = signalEndpoint ?? baseEndpoint;
  if (!rawEndpoint?.trim()) return undefined;

  return new OtlpLogExporter({
    endpoint: normalizeEndpoint(rawEndpoint.trim(), !signalEndpoint),
    headers: parseHeaders(env.OTEL_EXPORTER_OTLP_LOGS_HEADERS ?? env.OTEL_EXPORTER_OTLP_HEADERS),
    serviceName: args.serviceName,
    serviceVersion: args.serviceVersion
  });
}
