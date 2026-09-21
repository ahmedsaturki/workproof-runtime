import { LeaseStatus, WorkerStatus } from "../packages/coordination/src/leases";
const http = require("http");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { URL } = require("url");
const { JsonWorkRepository } = require("../packages/storage/src/json.js");
const { listProofs } = require("../packages/evidence/src/vault.js");
const { loadTrustPolicy, evaluateProofTrust } = require("../packages/evidence/src/trust.js");
const { verifyProofIntegrity } = require("../packages/evidence/src/integrity.js");
const { verifyProofSignature } = require("../packages/evidence/src/signature.js");

const MAX_WORKS = 1000;
const MAX_BODY_BYTES = 1024 * 1024;

export interface StudioOptions {
  workDirectory: string;
  host?: string;
  port?: number;
  controlPlaneUrl?: string;
  vaultDirectory?: string;
  trustPolicyPath?: string;
  workerStatusSource?: { listWorkerStatuses(staleAfterMs: number): WorkerStatus[] };
  workerStaleAfterMs?: number;
  leaseStatusSource?: { listLeaseStatuses(): LeaseStatus[] };
}

export interface RunningStudio {
  host: string;
  port: number;
  server: any;
  close(): Promise<void>;
}

function isWorkId(value: string): boolean {
  return /^[A-Za-z0-9._-]+$/.test(value);
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeWork(work: any): Record<string, unknown> {
  return {
    id: work.id,
    objective: work.contract?.objective ?? "",
    status: work.status,
    riskClass: work.contract?.riskClass,
    approvalRequired: Boolean(work.contract?.approvalRequired),
    createdAt: work.createdAt,
    updatedAt: work.updatedAt,
    deliverables: Array.isArray(work.contract?.deliverables) ? work.contract.deliverables : [],
    effects: Array.isArray(work.effects)
      ? work.effects.map((effect: any) => ({
          effectId: effect.effectId,
          operation: effect.operation,
          capability: effect.capability,
          riskClass: effect.riskClass,
          status: effect.status,
          attempts: effect.attempts
        }))
      : [],
    artifacts: Array.isArray(work.artifacts)
      ? work.artifacts.map((artifact: any) => ({
          uri: artifact?.uri,
          mediaType: artifact?.mediaType
        }))
      : [],
    verification: work.verification
      ? {
          status: work.verification.status,
          verifiedAt: work.verification.verifiedAt,
          checks: Array.isArray(work.verification.checks)
            ? work.verification.checks.map((check: any) => ({
                criterion: check.criterion,
                status: check.status,
                details: check.details,
                evidence: Array.isArray(check.evidence) ? check.evidence : []
              }))
            : []
        }
      : null,
    events: Array.isArray(work.events)
      ? work.events.slice(-50).map((event: any) => ({
          type: event.type,
          at: event.at,
          message: event.message
        }))
      : []
  };
}

function sendJson(res: any, statusCode: number, body: Record<string, unknown>, extraHeaders: Record<string, string> = {}): void {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
    "connection": "close",
    ...extraHeaders
  });
  res.end(payload);
}

function sendHtml(res: any, body: string): void {
  res.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
    "content-security-policy": "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
    "connection": "close"
  });
  res.end(body);
}

function readBody(req: any): Promise<string> {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks: any[] = [];
    req.on("data", (chunk: any) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function authHeader(req: any): string | null {
  const raw = req.headers?.authorization;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  return /^Bearer [A-Za-z0-9._~-]+$/.test(String(value).trim()) ? String(value).trim() : null;
}

function controlBaseUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Control plane URL must use HTTP or HTTPS");
  }
  return url.toString().replace(/\/$/, "");
}

async function forwardControl(
  controlPlaneUrl: string | undefined,
  req: any,
  route: string,
  body?: unknown
): Promise<{ status: number; payload: Record<string, unknown>; headers?: Record<string, string> }> {
  if (!controlPlaneUrl) return { status: 503, payload: { error: "control-not-configured" } };
  const token = authHeader(req);
  if (!token) return { status: 401, payload: { error: "unauthorized" } };

  const headers: Record<string, string> = { authorization: token };
  const idempotencyKey = req.headers?.["idempotency-key"];
  if (idempotencyKey !== undefined) {
    const value = Array.isArray(idempotencyKey) ? idempotencyKey[0] : String(idempotencyKey);
    if (!/^[A-Za-z0-9._~-]{1,200}$/.test(value)) {
      return { status: 400, payload: { error: "invalid-idempotency-key" } };
    }
    headers["idempotency-key"] = value;
  }
  if (body !== undefined) headers["content-type"] = "application/json";
  const response = await fetch(`${controlPlaneUrl}${route}`, {
    method: "POST",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const raw = await response.text();
  let data: any;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    return { status: 502, payload: { error: "control-plane-invalid-json" } };
  }
  if (data?.work) {
    return {
      status: response.status,
      headers: response.headers.get("x-idempotency-replayed") === "true"
        ? { "x-idempotency-replayed": "true" }
        : undefined,
      payload: {
        version: "2.1",
        ...(data.requestId ? { requestId: data.requestId } : {}),
        work: sanitizeWork(data.work)
      }
    };
  }
  return {
    status: response.status,
    payload: {
      ...(typeof data === "object" && data ? data : { error: String(data) })
    }
  };
}

function proofBundleFromFile(data: any): Record<string, unknown> {
  return {
    version: data.version,
    work: data.work,
    effects: data.effects,
    sagas: data.sagas ?? [],
    artifacts: data.artifacts,
    verification: data.verification,
    events: data.events
  };
}

function proofAuditSummary(record: any, vaultDirectory: string, trustPolicyPath?: string): Record<string, unknown> {
  const data = JSON.parse(fs.readFileSync(record.proofPath, "utf8"));
  const integrity = Boolean(data.integrity && verifyProofIntegrity(proofBundleFromFile(data), data.integrity));
  let signature: "verified" | "invalid" | "not-present" = "not-present";
  let trust: string = "not-present";
  if (data.signature) {
    signature = verifyProofSignature(data, data.signature) ? "verified" : "invalid";
    trust = trustPolicyPath
      ? evaluateProofTrust(loadTrustPolicy(trustPolicyPath), data.signature)
      : "unknown";
  }
  return {
    digest: record.digest,
    workId: record.workId,
    signerKeyId: record.signerKeyId ?? null,
    createdAt: record.createdAt,
    publishedAt: record.publishedAt,
    artifactCount: Object.keys(record.artifacts ?? {}).length,
    integrity: integrity ? "verified" : "invalid",
    signature,
    trust,
    verification: data.verification ? {
      status: data.verification.status,
      verifiedAt: data.verification.verifiedAt,
      checks: Array.isArray(data.verification.checks)
        ? data.verification.checks.map((check: any) => ({
            criterion: check.criterion,
            status: check.status,
            details: check.details,
            evidence: Array.isArray(check.evidence) ? check.evidence : []
          }))
        : []
    } : null,
    _vaultDirectory: vaultDirectory
  };
}

function sanitizeWorkerStatus(worker: WorkerStatus): Record<string, unknown> {
  return {
    workerId: worker.workerId,
    capabilities: Array.isArray(worker.capabilities) ? worker.capabilities.slice().sort() : [],
    state: worker.state,
    liveness: worker.liveness,
    heartbeatAgeMs: worker.heartbeatAgeMs,
    staleAfterMs: worker.staleAfterMs,
    reassignmentEligible: worker.reassignmentEligible
  };
}

function sanitizeLeaseStatus(lease: LeaseStatus): Record<string, unknown> {
  return {
    leaseId: lease.leaseId,
    resourceId: lease.resourceId,
    ownerId: lease.ownerId,
    acquiredAt: lease.acquiredAt,
    renewedAt: lease.renewedAt,
    expiresAt: lease.expiresAt,
    revision: lease.revision,
    active: lease.active
  };
}

async function fetchRemoteLeases(controlPlaneUrl: string | undefined, req: any): Promise<{ status: number; payload: Record<string, unknown> }> {
  if (!controlPlaneUrl) return { status: 503, payload: { error: "control-not-configured" } };
  const token = authHeader(req);
  if (!token) return { status: 401, payload: { error: "unauthorized" } };
  try {
    const response = await fetch(controlPlaneUrl + "/v1/leases", {
      method: "GET",
      headers: { authorization: token }
    });
    const raw = await response.text();
    let data: any = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      return { status: 502, payload: { error: "control-plane-invalid-json" } };
    }
    if (!response.ok) {
      return {
        status: response.status,
        payload: {
          error: typeof data?.error === "string" ? data.error : "lease-status-request-failed"
        }
      };
    }
    const leases = Array.isArray(data?.leases) ? data.leases : [];
    return {
      status: 200,
      payload: {
        version: "2.8",
        source: "control-plane",
        leases: leases.map((lease: LeaseStatus) => sanitizeLeaseStatus(lease))
      }
    };
  } catch {
    return { status: 503, payload: { error: "control-plane-unavailable" } };
  }
}
async function fetchRemoteWorkers(controlPlaneUrl: string | undefined, req: any): Promise<{ status: number; payload: Record<string, unknown> }> {
  if (!controlPlaneUrl) return { status: 503, payload: { error: "control-not-configured" } };
  const token = authHeader(req);
  if (!token) return { status: 401, payload: { error: "unauthorized" } };

  try {
    const response = await fetch(`${controlPlaneUrl}/v1/workers`, {
      method: "GET",
      headers: { authorization: token }
    });
    const raw = await response.text();
    let data: any = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      return { status: 502, payload: { error: "control-plane-invalid-json" } };
    }

    if (!response.ok) {
      return {
        status: response.status,
        payload: {
          error: typeof data?.error === "string" ? data.error : "worker-status-request-failed"
        }
      };
    }

    const workerList = Array.isArray(data?.workers) ? data.workers : [];
    return {
      status: 200,
      payload: {
        version: "2.7",
        source: "control-plane",
        ...(Number.isSafeInteger(data?.staleAfterMs) ? { staleAfterMs: data.staleAfterMs } : {}),
        workers: workerList.map((worker: WorkerStatus) => sanitizeWorkerStatus(worker))
      }
    };
  } catch {
    return { status: 503, payload: { error: "control-plane-unavailable" } };
  }
}

function studioHtml(controlEnabled: boolean): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>WorkProof Studio</title>
<style>
:root { font-family: system-ui, sans-serif; color-scheme: dark; }
body { margin: 0; background: #0d1117; color: #e6edf3; }
main { max-width: 1200px; margin: 0 auto; padding: 24px; }
header { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; }
small { color: #8b949e; }
.grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(280px,1fr)); gap: 16px; margin-top: 20px; }
.card { background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 16px; cursor: pointer; }
.card:hover { border-color: #58a6ff; }
.badge { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #21262d; font-size: 12px; }
pre { white-space: pre-wrap; word-break: break-word; background: #0d1117; padding: 12px; border-radius: 8px; }
button { background: #21262d; color: #e6edf3; border: 1px solid #30363d; padding: 8px 12px; border-radius: 8px; cursor: pointer; }
</style>
</head>
<body>
<main>
<header>
<div><h1>WorkProof Studio</h1><small>Local operational view · ${controlEnabled ? "authenticated control enabled" : "read-only foundation"}</small></div>
<button id="refresh">Refresh</button>
</header>
<section class="toolbar">
<label><small>Control token</small><br><input id="token" type="password" autocomplete="off" placeholder="Bearer token without prefix"></label>
<label><small>Dispatch objective</small><br><input id="dispatchObjective" autocomplete="off" placeholder="New bounded outcome"></label>
<button id="dispatch">Dispatch</button>
<span id="actionStatus"><small></small></span>
</section>
<section id="workersSection">
<h2>Workers</h2>
<div id="workers" class="grid"></div>
</section>
<section id="leasesSection">
<h2>Execution leases</h2>
<div id="leases" class="grid"></div>
</section>
<section class="toolbar" aria-label="Work filters">
<label><small>Search</small><br><input id="workQuery" autocomplete="off" placeholder="objective or work id"></label>
<label><small>Status</small><br><select id="workStatus"><option value="">All</option><option value="new">New</option><option value="planned">Planned</option><option value="running">Running</option><option value="waiting_verification">Waiting verification</option><option value="verified">Verified</option><option value="partial">Partial</option><option value="waiting_lease">Waiting lease</option><option value="failed">Failed</option><option value="unresolved">Unresolved</option><option value="unverifiable">Unverifiable</option><option value="cancelled">Cancelled</option></select></label>
<label><small>Risk</small><br><select id="workRisk"><option value="">All</option><option value="read">Read</option><option value="local_write">Local write</option><option value="external_write">External write</option><option value="destructive">Destructive</option><option value="financial">Financial</option></select></label>
<label><small>Limit</small><br><input id="workLimit" type="number" min="1" max="1000" value="100"></label>
<button id="clearFilters">Clear filters</button>
</section>
<section id="summary" class="grid"></section>
<section id="list" class="grid"></section>
<section id="detail" hidden>
<h2 id="title"></h2>
<div id="meta"></div>
<div class="toolbar">
<button id="resume">Resume</button>
<button id="cancel">Cancel</button>
</div>
<pre id="payload"></pre>
<section id="proofSection" hidden>
<h3>Proof & audit</h3>
<div id="proofs"></div>
</section>
</section>
</main>
<script>
const list = document.getElementById("list");
const detail = document.getElementById("detail");
const title = document.getElementById("title");
const meta = document.getElementById("meta");
const payload = document.getElementById("payload");
const token = document.getElementById("token");
const dispatchObjective = document.getElementById("dispatchObjective");
const actionStatus = document.getElementById("actionStatus");
const proofSection = document.getElementById("proofSection");
const workQuery = document.getElementById("workQuery");
const workStatus = document.getElementById("workStatus");
const workRisk = document.getElementById("workRisk");
const workLimit = document.getElementById("workLimit");
const summary = document.getElementById("summary");
const workers = document.getElementById("workers");
const leases = document.getElementById("leases");
const proofs = document.getElementById("proofs");
let selectedId = null;

function setActionStatus(message) {
  actionStatus.textContent = message;
}

async function control(route, body) {
  const value = token.value.trim();
  if (!value) { setActionStatus("Enter a control token."); return; }
  if (!selectedId && route !== "/api/control/dispatch") { setActionStatus("Select a Work Object first."); return; }
  setActionStatus("Sending…");
  const headers = {"authorization":"Bearer " + value, "idempotency-key": crypto.randomUUID().replace(/-/g, "")};
  if (body !== undefined) headers["content-type"] = "application/json";
  const response = await fetch(route, {method:"POST", headers, body: body === undefined ? undefined : JSON.stringify(body)});
  const data = await response.json();
  if (!response.ok) { setActionStatus(data.error || "Control request failed."); return; }
  await load();
  if (data.work?.id) await show(data.work.id);
  setActionStatus("Control request accepted.");
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

async function loadProofs(workId) {
  proofSection.hidden = false;
  proofs.innerHTML = "<div class='card'>Loading proof audit…</div>";
  const response = await fetch("/api/proofs?workId=" + encodeURIComponent(workId), {cache:"no-store"});
  const data = await response.json();
  if (response.status === 503) {
    proofSection.hidden = true;
    return;
  }
  if (!response.ok) throw new Error(data.error || "Failed to load proof audit");
  proofs.innerHTML = "";
  for (const proof of data.proofs) {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML =
      "<div><span class='badge'>" + esc(proof.integrity) + "</span> " +
      "<span class='badge'>" + esc(proof.signature) + "</span> " +
      "<span class='badge'>" + esc(proof.trust) + "</span></div>" +
      "<h4>" + esc(proof.digest) + "</h4>" +
      "<small>published " + esc(proof.publishedAt) + " · artifacts " + proof.artifactCount + "</small>";
    card.onclick = () => showProof(proof.digest);
    proofs.appendChild(card);
  }
  if (!data.proofs.length) proofs.innerHTML = "<div class='card'>No retained proof found for this Work Object.</div>";
}

async function showProof(digest) {
  const response = await fetch("/api/proof/" + encodeURIComponent(digest), {cache:"no-store"});
  const data = await response.json();
  if (!response.ok) { setActionStatus(data.error || "Failed to load proof audit."); return; }
  const detailCard = document.createElement("article");
  detailCard.className = "card";
  detailCard.innerHTML = "<div><span class='badge'>" + esc(data.proof.integrity) + "</span> " +
    "<span class='badge'>" + esc(data.proof.signature) + "</span> " +
    "<span class='badge'>" + esc(data.proof.trust) + "</span></div>" +
    "<h4>Proof " + esc(data.proof.digest) + "</h4>" +
    "<pre>" + esc(JSON.stringify(data.proof, null, 2)) + "</pre>";
  proofs.prepend(detailCard);
}

async function loadWorkers() {
  workers.innerHTML = "<div class='card'>Loading worker status…</div>";
  const workerHeaders = token.value.trim() ? {"authorization":"Bearer " + token.value.trim()} : {};
  const response = await fetch("/api/workers", {cache:"no-store", headers: workerHeaders});
  const data = await response.json();
  if (response.status === 503) {
    workers.innerHTML = "<div class='card'>Worker visibility is not configured.</div>";
    return;
  }
  if (!response.ok) throw new Error(data.error || "Failed to load workers");
  workers.innerHTML = "";
  for (const worker of data.workers) {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML =
      "<div><span class='badge'>" + esc(worker.liveness) + "</span> " +
      "<span class='badge'>" + esc(worker.state) + "</span> " +
      "<span class='badge'>" + (worker.reassignmentEligible ? "reassignment-eligible" : "lease-protected") + "</span></div>" +
      "<h3>" + esc(worker.workerId) + "</h3>" +
      "<small>heartbeat age " + Number(worker.heartbeatAgeMs) + "ms · stale after " + Number(worker.staleAfterMs) + "ms</small>" +
      "<pre>" + esc(JSON.stringify({capabilities: worker.capabilities}, null, 2)) + "</pre>";
    workers.appendChild(card);
  }
  if (!data.workers.length) workers.innerHTML = "<div class='card'>No registered workers.</div>";
}

async function loadLeases() {
  leases.innerHTML = "<div class='card'>Loading lease status…</div>";
  const response = await fetch("/api/leases", {cache:"no-store", headers: token.value.trim() ? {"authorization":"Bearer " + token.value.trim()} : {}});
  const data = await response.json();
  if (response.status === 503) {
    leases.innerHTML = "<div class='card'>Lease visibility is not configured.</div>";
    return;
  }
  if (response.status === 401) {
    leases.innerHTML = "<div class='card'>Lease visibility requires the control token.</div>";
    return;
  }
  if (!response.ok) throw new Error(data.error || "Failed to load leases");
  leases.innerHTML = "";
  for (const lease of data.leases) {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML =
      "<div><span class='badge'>" + esc(lease.active ? "active" : "expired") + "</span></div>" +
      "<h3>" + esc(lease.resourceId) + "</h3>" +
      "<small>owner " + esc(lease.ownerId) + " · revision " + Number(lease.revision) + "</small>" +
      "<pre>" + esc(JSON.stringify({leaseId: lease.leaseId, acquiredAt: lease.acquiredAt, renewedAt: lease.renewedAt, expiresAt: lease.expiresAt}, null, 2)) + "</pre>";
    leases.appendChild(card);
  }
  if (!data.leases.length) leases.innerHTML = "<div class='card'>No active execution leases.</div>";
}
async function load() {
  await loadWorkers().catch(error => { workers.innerHTML = "<div class='card'>" + esc(error.message) + "</div>"; });
  await loadLeases().catch(error => { leases.innerHTML = "<div class='card'>" + esc(error.message) + "</div>"; });
  detail.hidden = true;
  selectedId = null;
  list.innerHTML = "<div class='card'>Loading…</div>";
  const params = new URLSearchParams();
  if (workQuery.value.trim()) params.set("q", workQuery.value.trim());
  if (workStatus.value) params.set("status", workStatus.value);
  if (workRisk.value) params.set("risk", workRisk.value);
  const limit = Number(workLimit.value);
  if (Number.isInteger(limit) && limit > 0) params.set("limit", String(Math.min(limit, 1000)));
  const response = await fetch("/api/work" + (params.toString() ? "?" + params.toString() : ""), {cache:"no-store"});
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Failed to load work");
  summary.innerHTML =
    "<article class='card'><small>Total matching</small><h3>" + Number(data.total) + "</h3></article>" +
    "<article class='card'><small>Verified</small><h3>" + Number(data.byStatus?.verified || 0) + "</h3></article>" +
    "<article class='card'><small>Active</small><h3>" + Number((data.byStatus?.running || 0) + (data.byStatus?.waiting_verification || 0) + (data.byStatus?.waiting_lease || 0)) + "</h3></article>" +
    "<article class='card'><small>Risk: external write</small><h3>" + Number(data.byRisk?.external_write || 0) + "</h3></article>";
  list.innerHTML = "";
  for (const item of data.work) {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = "<div><span class='badge'>" + esc(item.status) + "</span> <span class='badge'>" + esc(item.riskClass) + "</span></div>" +
      "<h3>" + esc(item.objective) + "</h3>" +
      "<small>" + esc(item.id) + " · effects " + item.effectCount + " · artifacts " + item.artifactCount + "</small>";
    card.onclick = () => show(item.id);
    list.appendChild(card);
  }
  if (!data.work.length) list.innerHTML = "<div class='card'>No Work Objects match the current filters.</div>";
}

async function show(id) {
  const response = await fetch("/api/work/" + encodeURIComponent(id), {cache:"no-store"});
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Failed to load work");
  title.textContent = data.work.objective || data.work.id;
  meta.textContent = data.work.status + " · " + data.work.id;
  payload.textContent = JSON.stringify(data.work, null, 2);
  detail.hidden = false;
  await loadProofs(id).catch(error => { proofSection.hidden = false; proofs.innerHTML = "<div class='card'>" + esc(error.message) + "</div>"; });
  window.scrollTo({top: document.body.scrollHeight, behavior:"smooth"});
}

document.getElementById("refresh").onclick = () => load().catch(error => { list.innerHTML = "<div class='card'>" + esc(error.message) + "</div>"; });
document.getElementById("clearFilters").onclick = () => { workQuery.value = ""; workStatus.value = ""; workRisk.value = ""; workLimit.value = "100"; load().catch(error => { list.innerHTML = "<div class='card'>" + esc(error.message) + "</div>"; }); };
[workQuery, workStatus, workRisk, workLimit].forEach((element) => {
  element.addEventListener("change", () => load().catch(error => { list.innerHTML = "<div class='card'>" + esc(error.message) + "</div>"; }));
  if (element === workQuery) element.addEventListener("keydown", (event) => { if (event.key === "Enter") load().catch(error => { list.innerHTML = "<div class='card'>" + esc(error.message) + "</div>"; }); });
});
document.getElementById("dispatch").onclick = () => control("/api/control/dispatch", {objective: dispatchObjective.value.trim()});
document.getElementById("resume").onclick = () => control("/api/control/work/" + encodeURIComponent(selectedId) + "/resume", {});
document.getElementById("cancel").onclick = () => control("/api/control/work/" + encodeURIComponent(selectedId) + "/cancel", {});
load().catch(error => { list.innerHTML = "<div class='card'>" + esc(error.message) + "</div>"; });
</script>
</body>
</html>`;
}

export async function startStudio(options: StudioOptions): Promise<RunningStudio> {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 0;
  const workDirectory = path.resolve(options.workDirectory);
  const repository = new JsonWorkRepository(workDirectory);
  const configuredControlPlane = options.controlPlaneUrl ? controlBaseUrl(options.controlPlaneUrl) : undefined;
  const vaultDirectory = options.vaultDirectory ? path.resolve(options.vaultDirectory) : undefined;
  const workerStaleAfterMs = options.workerStaleAfterMs ?? 30_000;
  if (!Number.isSafeInteger(workerStaleAfterMs) || workerStaleAfterMs <= 0) {
    throw new Error("Worker stale threshold must be a positive safe integer");
  }

  const server = http.createServer(async (req: any, res: any) => {
    try {
      const method = String(req.method ?? "GET").toUpperCase();
      const url = new URL(String(req.url ?? "/"), `http://${host}`);

      if (method === "GET" && url.pathname === "/health") {
        sendJson(res, 200, {
          status: "ok",
          version: "2.9",
          mode: configuredControlPlane ? "authenticated-control" : "read-only",
          proofVault: Boolean(vaultDirectory)
        });
        return;
      }

      if (method === "GET" && url.pathname === "/") {
        sendHtml(res, studioHtml(Boolean(configuredControlPlane)));
        return;
      }

      if (method === "GET" && url.pathname === "/api/leases") {
        if (configuredControlPlane) {
          const remote = await fetchRemoteLeases(configuredControlPlane, req);
          sendJson(res, remote.status, remote.payload);
          return;
        }
        if (!options.leaseStatusSource) {
          sendJson(res, 503, { error: "lease-status-not-configured" });
          return;
        }
        const leaseList = options.leaseStatusSource.listLeaseStatuses();
        sendJson(res, 200, {
          version: "2.8",
          source: "local",
          leases: leaseList.map(sanitizeLeaseStatus)
        });
        return;
      }
      if (method === "GET" && url.pathname === "/api/workers") {
        if (configuredControlPlane) {
          const remote = await fetchRemoteWorkers(configuredControlPlane, req);
          sendJson(res, remote.status, remote.payload);
          return;
        }
        if (!options.workerStatusSource) {
          sendJson(res, 503, { error: "worker-status-not-configured" });
          return;
        }
        const workerList = options.workerStatusSource.listWorkerStatuses(workerStaleAfterMs);
        sendJson(res, 200, {
          version: "2.6",
          source: "local",
          staleAfterMs: workerStaleAfterMs,
          workers: workerList.map(sanitizeWorkerStatus)
        });
        return;
      }

      if (method === "GET" && url.pathname === "/api/work") {
        const query = (url.searchParams.get("q") ?? "").trim().toLowerCase();
        if (query.length > 200) {
          sendJson(res, 400, { error: "query-too-long" });
          return;
        }
        const status = (url.searchParams.get("status") ?? "").trim();
        const risk = (url.searchParams.get("risk") ?? "").trim();
        const limitRaw = url.searchParams.get("limit");
        const limit = limitRaw === null ? 100 : Number(limitRaw);
        const validStatuses = new Set([
          "new", "planned", "running", "waiting_verification", "verified", "partial",
          "waiting_lease", "failed", "unresolved", "unverifiable", "cancelled"
        ]);
        const validRisks = new Set(["read", "local_write", "external_write", "destructive", "financial"]);
        if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_WORKS) {
          sendJson(res, 400, { error: "invalid-limit" });
          return;
        }
        if (status && !validStatuses.has(status)) {
          sendJson(res, 400, { error: "invalid-status" });
          return;
        }
        if (risk && !validRisks.has(risk)) {
          sendJson(res, 400, { error: "invalid-risk" });
          return;
        }

        const files = repository.list().filter((file: string) => file.endsWith(".json"));
        const matched = [];
        for (const file of files) {
          const id = file.slice(0, -".json".length);
          if (!isWorkId(id)) continue;
          try {
            const value = sanitizeWork(repository.load(id));
            if (status && value.status !== status) continue;
            if (risk && value.riskClass !== risk) continue;
            if (query && !String(value.id).toLowerCase().includes(query) && !String(value.objective).toLowerCase().includes(query)) continue;
            matched.push({
              id: value.id,
              objective: value.objective,
              status: String(value.status),
              riskClass: String(value.riskClass),
              updatedAt: value.updatedAt,
              effectCount: Array.isArray(value.effects) ? value.effects.length : 0,
              artifactCount: Array.isArray(value.artifacts) ? value.artifacts.length : 0
            });
          } catch {
            // A corrupt individual Work Object is omitted from the dashboard list.
          }
        }
        matched.sort((a: any, b: any) => {
          const byUpdated = String(b.updatedAt).localeCompare(String(a.updatedAt));
          return byUpdated || String(a.id).localeCompare(String(b.id));
        });
        const byStatus: Record<string, number> = {};
        const byRisk: Record<string, number> = {};
        for (const item of matched) {
          byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
          byRisk[item.riskClass] = (byRisk[item.riskClass] ?? 0) + 1;
        }
        sendJson(res, 200, {
          version: "2.9",
          filters: { q: query, status: status || null, risk: risk || null, limit },
          total: matched.length,
          byStatus,
          byRisk,
          work: matched.slice(0, limit)
        });
        return;
      }

      const match = /^\/api\/work\/([A-Za-z0-9._-]+)$/.exec(url.pathname);
      if (method === "GET" && match) {
        const id = match[1];
        if (!isWorkId(id)) {
          sendJson(res, 400, { error: "invalid-work-id" });
          return;
        }
        const work = sanitizeWork(repository.load(id));
        sendJson(res, 200, { version: "2.1", work });
        return;
      }

      if (method === "POST" && url.pathname === "/api/control/dispatch") {
        const raw = await readBody(req);
        let input: Record<string, unknown>;
        try { input = JSON.parse(raw); } catch {
          sendJson(res, 400, { error: "invalid-json" });
          return;
        }
        if (!input || typeof input !== "object" || Array.isArray(input) || typeof input.objective !== "string" || !input.objective.trim()) {
          sendJson(res, 400, { error: "dispatch-objective-required" });
          return;
        }
        const forwarded = await forwardControl(configuredControlPlane, req, "/v1/work/dispatch", input);
        sendJson(res, forwarded.status, forwarded.payload, forwarded.headers);
        return;
      }

      if (method === "GET" && url.pathname === "/api/proofs") {
        if (!vaultDirectory) {
          sendJson(res, 503, { error: "proof-vault-not-configured" });
          return;
        }
        const workId = url.searchParams.get("workId");
        if (workId !== null && !isWorkId(workId)) {
          sendJson(res, 400, { error: "invalid-work-id" });
          return;
        }
        const records = listProofs(vaultDirectory)
          .filter((record: any) => workId === null || record.workId === workId)
          .slice(0, 100);
        const proofs = records.map((record: any) => {
          try {
            return proofAuditSummary(record, vaultDirectory, options.trustPolicyPath);
          } catch {
            return {
              digest: record.digest,
              workId: record.workId,
              signerKeyId: record.signerKeyId ?? null,
              createdAt: record.createdAt,
              publishedAt: record.publishedAt,
              artifactCount: Object.keys(record.artifacts ?? {}).length,
              integrity: "invalid",
              signature: "invalid",
              trust: "unknown",
              verification: null
            };
          }
        }).map((proof: any) => {
          const { _vaultDirectory, ...publicProof } = proof;
          return publicProof;
        });
        sendJson(res, 200, { version: "2.2", proofs });
        return;
      }

      const proofMatch = /^\/api\/proof\/([0-9a-f]{64})$/.exec(url.pathname);
      if (method === "GET" && proofMatch) {
        if (!vaultDirectory) {
          sendJson(res, 503, { error: "proof-vault-not-configured" });
          return;
        }
        const digest = proofMatch[1];
        const record = listProofs(vaultDirectory).find((item: any) => item.digest === digest);
        if (!record) {
          sendJson(res, 404, { error: "unknown-proof" });
          return;
        }
        const proof = proofAuditSummary(record, vaultDirectory, options.trustPolicyPath);
        const { _vaultDirectory, ...publicProof } = proof;
        sendJson(res, 200, { version: "2.2", proof: publicProof });
        return;
      }

      const controlMatch = /^\/api\/control\/work\/([A-Za-z0-9._-]+)\/(cancel|resume)$/.exec(url.pathname);
      if (method === "POST" && controlMatch) {
        const workId = controlMatch[1];
        const action = controlMatch[2];
        const forwarded = await forwardControl(
          configuredControlPlane,
          req,
          `/v1/work/${encodeURIComponent(workId)}/${action}`,
          {}
        );
        sendJson(res, forwarded.status, forwarded.payload, forwarded.headers);
        return;
      }

      sendJson(res, 404, { error: "not-found" });
    } catch (error) {
      const message = String(error);
      const status = /ENOENT|Unknown work/i.test(message) ? 404 : 500;
      sendJson(res, status, { error: message });
    }
  });

  const actualPort = await new Promise<number>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Studio did not expose a TCP address"));
        return;
      }
      resolve(address.port);
    });
  });

  return {
    host,
    port: actualPort,
    server,
    close: () => new Promise((resolve, reject) => {
      server.closeAllConnections?.();
      server.close((error: unknown) => error ? reject(error) : resolve());
    })
  };
}

const runtimeProcess = require("process");

if (runtimeProcess.argv[1] && path.resolve(runtimeProcess.argv[1]) === path.resolve(__filename)) {
  const [, , workDirectoryArg, portArg, hostArg, controlPlaneUrlArg, vaultDirectoryArg, trustPolicyPathArg] = process.argv;
  const workDirectory = workDirectoryArg ?? "./work-runs";
  const port = portArg ? Number(portArg) : 8788;
  const host = hostArg ?? "127.0.0.1";
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    process.stderr.write("Invalid Studio port\n");
    process.exitCode = 1;
  } else {
    startStudio({ workDirectory, port, host })
      .then((running) => {
        process.stdout.write(JSON.stringify({
          studio: `http://${running.host}:${running.port}`,
          workDirectory: path.resolve(workDirectory),
          version: "2.9",
          mode: controlPlaneUrlArg ? "authenticated-control" : "read-only",
          proofVault: Boolean(vaultDirectoryArg)
        }, null, 2) + "\n");
      })
      .catch((error) => {
        process.stderr.write(String(error) + "\n");
        process.exitCode = 1;
      });
  }
}
