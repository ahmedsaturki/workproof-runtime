const http = require("http");
const path = require("path");
const fs = require("fs");
const { URL } = require("url");
const { JsonWorkRepository } = require("../packages/storage/src/json.js");

const MAX_WORKS = 1000;

export interface StudioOptions {
  workDirectory: string;
  host?: string;
  port?: number;
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

function sendJson(res: any, statusCode: number, body: Record<string, unknown>): void {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "connection": "close"
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
    "connection": "close"
  });
  res.end(body);
}

function studioHtml(): string {
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
<div><h1>WorkProof Studio</h1><small>Local operational view · read-only foundation</small></div>
<button id="refresh">Refresh</button>
</header>
<section id="list" class="grid"></section>
<section id="detail" hidden>
<h2 id="title"></h2>
<div id="meta"></div>
<pre id="payload"></pre>
</section>
</main>
<script>
const list = document.getElementById("list");
const detail = document.getElementById("detail");
const title = document.getElementById("title");
const meta = document.getElementById("meta");
const payload = document.getElementById("payload");

function esc(value) {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

async function load() {
  detail.hidden = true;
  list.innerHTML = "<div class='card'>Loading…</div>";
  const response = await fetch("/api/work", {cache:"no-store"});
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Failed to load work");
  list.innerHTML = "";
  for (const item of data.work) {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = "<div><span class='badge'>" + esc(item.status) + "</span></div>" +
      "<h3>" + esc(item.objective) + "</h3>" +
      "<small>" + esc(item.id) + " · effects " + item.effectCount + " · artifacts " + item.artifactCount + "</small>";
    card.onclick = () => show(item.id);
    list.appendChild(card);
  }
  if (!data.work.length) list.innerHTML = "<div class='card'>No persisted Work Objects found.</div>";
}

async function show(id) {
  const response = await fetch("/api/work/" + encodeURIComponent(id), {cache:"no-store"});
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Failed to load work");
  title.textContent = data.work.objective || data.work.id;
  meta.textContent = data.work.status + " · " + data.work.id;
  payload.textContent = JSON.stringify(data.work, null, 2);
  detail.hidden = false;
  window.scrollTo({top: document.body.scrollHeight, behavior:"smooth"});
}

document.getElementById("refresh").onclick = () => load().catch(error => { list.innerHTML = "<div class='card'>" + esc(error.message) + "</div>"; });
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

  const server = http.createServer(async (req: any, res: any) => {
    try {
      const method = String(req.method ?? "GET").toUpperCase();
      const url = new URL(String(req.url ?? "/"), `http://${host}`);

      if (method === "GET" && url.pathname === "/health") {
        sendJson(res, 200, { status: "ok", version: "2.0", mode: "read-only" });
        return;
      }

      if (method === "GET" && url.pathname === "/") {
        sendHtml(res, studioHtml());
        return;
      }

      if (method === "GET" && url.pathname === "/api/work") {
        const files = repository.list().filter((file: string) => file.endsWith(".json")).slice(0, MAX_WORKS);
        const work = [];
        for (const file of files) {
          const id = file.slice(0, -".json".length);
          if (!isWorkId(id)) continue;
          try {
            const value = sanitizeWork(repository.load(id));
            work.push({
              id: value.id,
              objective: value.objective,
              status: value.status,
              updatedAt: value.updatedAt,
              effectCount: Array.isArray(value.effects) ? value.effects.length : 0,
              artifactCount: Array.isArray(value.artifacts) ? value.artifacts.length : 0
            });
          } catch {
            // A corrupt individual Work Object is omitted from the dashboard list.
          }
        }
        work.sort((a: any, b: any) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
        sendJson(res, 200, { version: "2.0", work });
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
        sendJson(res, 200, { version: "2.0", work });
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
  const [, , workDirectoryArg, portArg, hostArg] = process.argv;
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
          version: "2.0",
          mode: "read-only"
        }, null, 2) + "\n");
      })
      .catch((error) => {
        process.stderr.write(String(error) + "\n");
        process.exitCode = 1;
      });
  }
}
