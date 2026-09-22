const fs = require("fs");
const path = require("path");

export type DoctorState = "ok" | "warn" | "failed" | "skipped";

export interface DoctorCheck {
  id: string;
  state: DoctorState;
  detail: string;
  latencyMs?: number;
}

export interface DoctorReport {
  version: string;
  status: "ready" | "degraded" | "failed";
  checks: DoctorCheck[];
}

function compareVersions(a: string, b: string): number {
  const left = a.replace(/^[^0-9]*/, "").split(".").map(Number);
  const right = b.replace(/^[^0-9]*/, "").split(".").map(Number);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const l = Number.isFinite(left[index]) ? left[index] : 0;
    const r = Number.isFinite(right[index]) ? right[index] : 0;
    if (l !== r) return l - r;
  }
  return 0;
}

function runtimeVersion(): string {
  const cwd = require("process").cwd();
  const here = path.dirname(require.resolve("./index"));
  const candidates = [
    path.resolve(here, "../../../package.json"),
    path.resolve(here, "../../package.json"),
    path.resolve(cwd, "package.json")
  ];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(fs.readFileSync(candidate, "utf8"));
      if (typeof parsed?.version === "string" && parsed.version.trim()) return parsed.version.trim();
    } catch {}
  }
  const env = process.env.npm_package_version;
  if (env?.trim()) return env.trim();
  return "unknown";
}

function pushFileCheck(checks: DoctorCheck[], id: string, target: string): void {
  try {
    const stat = fs.statSync(target);
    if (stat.isDirectory()) checks.push({ id, state: "ok", detail: "directory exists" });
    else checks.push({ id, state: "ok", detail: "file exists" });
  } catch (error) {
    checks.push({ id, state: "failed", detail: String((error as any)?.message ?? error) });
  }
}

async function probe(checks: DoctorCheck[], id: string, baseUrl: string, pathName: string, options: { token?: string; expected?: (body: any) => boolean } = {}): Promise<void> {
  const started = Date.now();
  try {
    const url = new URL(pathName, baseUrl.endsWith("/") ? baseUrl : baseUrl + "/").toString();
    const headers: Record<string, string> = { accept: "application/json" };
    if (options.token) headers.authorization = "Bearer " + options.token;
    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(5000)
    });
    const text = await response.text();
    let body: any = null;
    try { body = text ? JSON.parse(text) : null; } catch {}
    if (!response.ok) {
      checks.push({ id, state: "failed", detail: "HTTP " + response.status, latencyMs: Date.now() - started });
      return;
    }
    if (options.expected && !options.expected(body)) {
      checks.push({ id, state: "failed", detail: "unexpected response shape", latencyMs: Date.now() - started });
      return;
    }
    checks.push({ id, state: "ok", detail: "HTTP " + response.status, latencyMs: Date.now() - started });
  } catch (error) {
    checks.push({ id, state: "failed", detail: String((error as any)?.message ?? error), latencyMs: Date.now() - started });
  }
}

export async function runDoctor(env: Record<string, string | undefined> = process.env): Promise<DoctorReport> {
  const version = runtimeVersion();
  const checks: DoctorCheck[] = [];

  checks.push({
    id: "node-version",
    state: compareVersions(process.version, "v24.15.0") >= 0 ? "ok" : "failed",
    detail: process.version
  });

  const workDirectory = path.resolve(env.WORKPROOF_WORK_DIRECTORY ?? "./work-runs");
  try {
    const stat = fs.statSync(workDirectory);
    checks.push({ id: "work-directory", state: stat.isDirectory() ? "ok" : "failed", detail: stat.isDirectory() ? workDirectory : "configured work directory is not a directory" });
    if (stat.isDirectory()) {
      try {
        fs.accessSync(workDirectory, fs.constants.R_OK | fs.constants.W_OK);
        checks.push({ id: "work-directory-access", state: "ok", detail: "read/write access available" });
      } catch (error) {
        checks.push({ id: "work-directory-access", state: "failed", detail: String((error as any)?.message ?? error) });
      }
    }
  } catch {
    checks.push({ id: "work-directory", state: "warn", detail: workDirectory + " does not exist yet" });
  }

  const here = path.dirname(require.resolve("./index"));
  pushFileCheck(checks, "cli-entrypoint", path.resolve(here, "../../cli/src/index.js"));
  pushFileCheck(checks, "control-plane-entrypoint", path.resolve(here, "../../../apps/control-plane.js"));
  pushFileCheck(checks, "studio-entrypoint", path.resolve(here, "../../../apps/studio.js"));
  pushFileCheck(checks, "a2a-entrypoint", path.resolve(here, "../../../apps/a2a-server.js"));

  const controlPlaneUrl = env.WORKPROOF_CONTROL_PLANE_URL;
  if (controlPlaneUrl) {
    await probe(checks, "control-plane-health", controlPlaneUrl, "/health", {
      expected: (body) => body?.status === "ok" && body?.version === version
    });
    await probe(checks, "control-plane-readiness", controlPlaneUrl, "/ready", {
      expected: (body) => body?.status === "ready" && body?.version === version
    });
  } else {
    checks.push({ id: "control-plane-health", state: "skipped", detail: "WORKPROOF_CONTROL_PLANE_URL is not configured" });
    checks.push({ id: "control-plane-readiness", state: "skipped", detail: "WORKPROOF_CONTROL_PLANE_URL is not configured" });
  }

  const studioUrl = env.WORKPROOF_STUDIO_URL;
  if (studioUrl) {
    const token = env.WORKPROOF_STUDIO_TOKEN;
    await probe(checks, "studio-health", studioUrl, "/api/operations/overview", {
      ...(token ? { token } : {}),
      expected: (body) => body && typeof body === "object" && body.version === "3.0" && typeof body.work === "object"
    });
  } else {
    checks.push({ id: "studio-health", state: "skipped", detail: "WORKPROOF_STUDIO_URL is not configured" });
  }

  const a2aUrl = env.WORKPROOF_A2A_URL;
  if (a2aUrl) {
    await probe(checks, "a2a-agent-card", a2aUrl, "/.well-known/agent-card.json", {
      expected: (body) => body?.name === "WorkProof Runtime" && body?.version === version && Array.isArray(body?.supportedInterfaces)
    });
  } else {
    checks.push({ id: "a2a-agent-card", state: "skipped", detail: "WORKPROOF_A2A_URL is not configured" });
  }

  const failed = checks.filter((check) => check.state === "failed");
  const warnings = checks.filter((check) => check.state === "warn");
  return {
    version,
    status: failed.length ? "failed" : (warnings.length ? "degraded" : "ready"),
    checks
  };
}
