import { Capability, CapabilityReceipt, EvidenceRef, Verifier } from "../../core/src/types";
const { spawn } = require("child_process");
const { request: httpRequest } = require("http");
const net = require("net");
const { randomBytes } = require("crypto");
const fs = require("fs");
const path = require("path");
const platform = require("process").platform;

interface BrowserAction { type: "navigate" | "fill" | "click" | "get_text"; selector?: string; value?: string; url?: string; }
export interface BrowserWorkflowInput { startUrl: string; actions: BrowserAction[]; expectedText?: string; html?: string; cdpPort?: number; }

function windowsSystemCommand(command: string): string {
  const systemRoot = process.env.SystemRoot ?? process.env.WINDIR;
  if (!systemRoot) throw new Error("SystemRoot/WINDIR is required for Windows process control");
  return path.join(systemRoot, "System32", `${command}.exe`);
}

function isAllowedBrowserUrl(value: string): boolean {
  try {
    const u = new URL(value);
    if (u.protocol === "about:" && u.href === "about:blank") return true;
    return u.protocol === "http:" && (u.hostname === "127.0.0.1" || u.hostname === "localhost");
  } catch { return false; }
}

const browserCodeCharMap: Record<string, string> = {
  "<": "\\u003C",
  ">": "\\u003E",
  "/": "\\u002F",
  "\b": "\\b",
  "\f": "\\f",
  "\n": "\\n",
  "\r": "\\r",
  "\t": "\\t",
  "\0": "\\0",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029"
};

function escapeUnsafeChars(str: string): string {
  return str.replace(/[<>\b\f\n\r\t\0\u2028\u2029]/g, x => browserCodeCharMap[x]);
}

function runtimeEvaluateString(value: string): string {
  const serialized = JSON.stringify(value);
  if (typeof serialized !== "string") throw new Error("Unable to serialize browser evaluation string");
  return escapeUnsafeChars(serialized);
}

function cdpHttp(port: number, pathname: string, method = "GET", timeoutMs = 1500): Promise<any> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const finish = (fn: () => void) => { clearTimeout(timer); fn(); };
    const req = httpRequest({ hostname: "127.0.0.1", port, path: pathname, method, signal: controller.signal }, (res: any) => {
      let raw = "";
      res.on("data", (c: any) => raw += c.toString());
      res.on("end", () => {
        finish(() => {
          try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); }
        });
      });
    });
    req.on("error", (error: any) => finish(() => reject(error)));
    req.end();
  });
}

async function connectCdp(port: number): Promise<{ ws: WebSocket; close: () => void }> {
  const list = await cdpHttp(port, "/json/list");
  const target = list.find((x: any) => x.type === "page");
  if (!target?.webSocketDebuggerUrl) throw new Error("No Chromium CDP page target available");
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => { if (settled) return; settled = true; fn(); };
    const timer = setTimeout(() => finish(() => { try { ws.close(); } catch {} reject(new Error("CDP websocket connection timed out")); }), 10000);
    ws.addEventListener("open", () => finish(() => { clearTimeout(timer); resolve(); }), { once: true });
    ws.addEventListener("error", () => finish(() => { clearTimeout(timer); reject(new Error("CDP websocket connection failed")); }), { once: true });
    ws.addEventListener("close", () => finish(() => { clearTimeout(timer); reject(new Error("CDP websocket closed before connection completed")); }), { once: true });
  });
  let nextId = 1;
  const pending = new Map<number, (value: any) => void>();
  ws.addEventListener("message", (ev: any) => {
    const msg = JSON.parse(String(ev.data));
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)!(msg); pending.delete(msg.id); }
  });
  const call = (method: string, params?: any) => new Promise<any>((resolve, reject) => {
    const id = nextId++;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); } }, 10000);
  });
  (ws as any).call = call;
  return { ws, close: () => { try { ws.close(); } catch {} } };
}

async function evaluate(ws: WebSocket & { call?: (m: string, p?: any) => Promise<any> }, expression: string): Promise<any> {
  const result = await ws.call!("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result?.result?.exceptionDetails) { const d = result.result.exceptionDetails; const detail = d.exception?.description ?? d.text ?? "Browser evaluation failed"; throw new Error(String(detail)); }
  return result?.result?.result?.value;
}

async function waitFor(ws: WebSocket & { call?: (m: string, p?: any) => Promise<any> }, expression: string, timeoutMs = 5000): Promise<boolean> {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (await evaluate(ws, expression)) return true;
    await new Promise(r => setTimeout(r, 100));
  }
  return false;
}

export function resolveBrowserBinary(): string {
  const explicit = process.env.WORKPROOF_BROWSER_BINARY?.trim();
  if (explicit) return explicit;

  const candidates: string[] = platform === "win32"
    ? [
        path.join(process.env.PROGRAMFILES ?? "C:\\Program Files", "Google", "Chrome", "Application", "chrome.exe"),
        path.join(process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)", "Google", "Chrome", "Application", "chrome.exe"),
        path.join(process.env.LOCALAPPDATA ?? "", "Google", "Chrome", "Application", "chrome.exe"),
        path.join(process.env.PROGRAMFILES ?? "C:\\Program Files", "Microsoft", "Edge", "Application", "msedge.exe"),
        path.join(process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)", "Microsoft", "Edge", "Application", "msedge.exe"),
        path.join(process.env.LOCALAPPDATA ?? "", "Microsoft", "Edge", "Application", "msedge.exe"),
        "chrome.exe",
        "msedge.exe"
      ]
    : ["chromium", "chromium-browser", "google-chrome", "google-chrome-stable"];

  const pathEntries = (process.env.PATH ?? "").split(path.delimiter).map(entry => entry.trim().replace(/^"|"$/g, "")).filter(Boolean);
  for (const candidate of candidates) {
    if (path.isAbsolute(candidate)) {
      if (fs.existsSync(candidate)) return candidate;
      continue;
    }
    for (const entry of pathEntries) {
      const resolved = path.join(entry, candidate);
      if (fs.existsSync(resolved)) return resolved;
    }
  }

  throw new Error(
    "No supported Chromium executable was found. Set WORKPROOF_BROWSER_BINARY to an absolute path or executable name."
  );
}

async function findFreeLoopbackPort(): Promise<number> {
  const server = net.createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  const port = address && typeof address === "object" ? address.port : 0;
  await new Promise<void>((resolve, reject) => {
    server.close((error: any) => error ? reject(error) : resolve());
  });
  if (!port) throw new Error("Unable to allocate a loopback port for Chromium CDP");
  return port;
}

function ensureBrowser(port = 0): any {
  const profile = fs.mkdtempSync(path.join(require("os").tmpdir(), `workproof-chromium-${process.pid}-${randomBytes(4).toString("hex")}-`));
  const browserBinary = resolveBrowserBinary();
  const browser = spawn(browserBinary, [
    "--headless",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--remote-allow-origins=*",
    "--remote-debugging-address=127.0.0.1",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    "about:blank"
  ], { stdio: ["ignore", "pipe", "pipe"], detached: platform !== "win32" });
  browser.workproofProfile = profile;
  const drain = (chunk: any) => { browser.workproofOutput = String(browser.workproofOutput ?? "") + chunk.toString().slice(-4096); if (browser.workproofOutput.length > 16384) browser.workproofOutput = browser.workproofOutput.slice(-16384); };
  browser.stdout?.on("data", drain);
  browser.stderr?.on("data", drain);
  try { browser.unref?.(); } catch {}
  return browser;
}

async function waitForCdp(browser: any, requestedPort = 0): Promise<number> {
  if (requestedPort > 0) {
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      try {
        await cdpHttp(requestedPort, "/json/version");
        return requestedPort;
      } catch {
        await new Promise(r => setTimeout(r, 100));
      }
    }
    throw new Error(`Chromium CDP did not become ready on requested port ${requestedPort}`);
  }

  let output = "";
  let exitCode: number | null = null;
  let exitSignal: string | null = null;
  const append = (chunk: any) => { output += chunk.toString(); };
  const onExit = (code: number | null, signal: string | null) => {
    exitCode = code;
    exitSignal = signal;
  };
  browser.stdout?.on("data", append);
  browser.stderr?.on("data", append);
  browser.once?.("exit", onExit);
  try {
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      const match = /DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//.exec(output);
      if (match) {
        const port = Number(match[1]);
        const endpointDeadline = Date.now() + 5000;
        while (Date.now() < endpointDeadline) {
          try {
            await cdpHttp(port, "/json/version");
            return port;
          } catch {
            await new Promise(r => setTimeout(r, 100));
          }
        }
      }
      if (browser.exitCode !== null) break;
      await new Promise(r => setTimeout(r, 100));
    }
  } finally {
    browser.stdout?.off?.("data", append);
    browser.stderr?.off?.("data", append);
    browser.off?.("exit", onExit);
  }

  const detail = output.trim() || [
    exitCode === null ? null : `Chromium exited with code ${exitCode}`,
    exitSignal ? `signal ${exitSignal}` : null
  ].filter(Boolean).join("; ");
  throw new Error(detail || "Chromium CDP did not announce an endpoint");
}

function killBrowser(browser: any): void {
  if (!browser) return;
  const browserPid = (browser as any).pid as number | undefined;
  try { browser.stdout?.removeAllListeners?.("data"); browser.stderr?.removeAllListeners?.("data"); } catch {}
  try { browser.kill("SIGKILL"); } catch {}
  if (browserPid && platform !== "win32") {
    try { process.kill(-browserPid, "SIGKILL"); } catch {}
  } else if (browserPid && platform === "win32") {
    try {
      const killer = spawn(windowsSystemCommand("taskkill"), ["/PID", String(browserPid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
        detached: true
      });
      killer.unref?.();
    } catch {}
  }
  try {
    if (browser.workproofProfile) {
      fs.rmSync(browser.workproofProfile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    }
  } catch {}
}

class LocalBrowserCapability implements Capability {
  name = "pack.browser.local";
  version = "0.1.0";
  operations = ["browser_workflow"];
  riskClass = "local_write" as const;

  async execute(request: any, ctx: any): Promise<CapabilityReceipt> {
    const input = request.input as BrowserWorkflowInput;
    if (!isAllowedBrowserUrl(input.startUrl)) {
      return { status: "rejected", data: { reason: "Only local HTTP or HTML data-page targets are allowed by the local pack" } };
    }

    const requestedPort = input.cdpPort ?? 0;
    let lastError = "Chromium browser workflow did not complete";
    for (let launchAttempt = 1; launchAttempt <= 3; launchAttempt++) {
      let browser: any;
      try {
        const launchPort = requestedPort > 0 ? requestedPort : await findFreeLoopbackPort();
        browser = ensureBrowser(launchPort);
        const port = await waitForCdp(browser, launchPort);
        const session = await connectCdp(port);
        const ws = session.ws as WebSocket & { call?: (m: string, p?: any) => Promise<any> };
        try {
          await ws.call!("Page.enable");
          await ws.call!("Runtime.enable");
          await ws.call!("Page.navigate", { url: input.startUrl });
          if (!(await waitFor(ws, "document.readyState === 'complete'"))) throw new Error("Initial page did not become ready");
          if (input.html) {
            await evaluate(ws, `document.open();document.write(${JSON.stringify(input.html)});document.close();void 0`);
            if (!(await waitFor(ws, "document.readyState === 'complete'"))) throw new Error("Injected page did not become ready");
          }

          const outputs: any[] = [];
          for (const action of input.actions) {
            switch (action.type) {
              case "navigate":
                if (!action.url || !isAllowedBrowserUrl(action.url)) throw new Error("navigate target must be an allowed local HTTP or HTML data page");
                await ws.call!("Page.navigate", { url: action.url });
                if (!(await waitFor(ws, "document.readyState === 'complete'"))) throw new Error("Navigated page did not become ready");
                outputs.push({ type: action.type, url: action.url });
                break;
              case "fill":
                if (!action.selector) throw new Error("fill requires selector");
                if (!(await waitFor(ws, `Boolean(document.querySelector(${JSON.stringify(action.selector)}))`))) throw new Error(`fill target not found: ${action.selector}`);
                await evaluate(ws, `(()=>{const e=document.querySelector(${JSON.stringify(action.selector)}); if(!e) throw new Error('not found'); e.focus(); e.value=${JSON.stringify(action.value ?? "")}; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); return e.value;})()`);
                outputs.push({ type: action.type, selector: action.selector });
                break;
              case "click":
                if (!action.selector) throw new Error("click requires selector");
                if (!(await waitFor(ws, `Boolean(document.querySelector(${JSON.stringify(action.selector)}))`))) throw new Error(`click target not found: ${action.selector}`);
                await evaluate(ws, `(()=>{const e=document.querySelector(${JSON.stringify(action.selector)}); if(!e) throw new Error('not found'); e.click(); return true;})()`);
                if (!(await waitFor(ws, "document.readyState === 'complete'"))) throw new Error("Page did not settle after click");
                outputs.push({ type: action.type, selector: action.selector });
                break;
              case "get_text":
                if (!action.selector) throw new Error("get_text requires selector");
                if (!(await waitFor(ws, `Boolean(document.querySelector(${JSON.stringify(action.selector)}))`))) throw new Error(`text target not found: ${action.selector}`);
                outputs.push({ type: action.type, text: await evaluate(ws, `(()=>{const e=document.querySelector(${JSON.stringify(action.selector)}); return e ? e.textContent : null;})()`) });
                break;
            }
          }

          const finalUrl = await evaluate(ws, "location.href");
          const bodyText = await evaluate(ws, "document.body ? document.body.innerText : ''");
          const evidence: EvidenceRef[] = [
            { id: `browser:url:${finalUrl}`, kind: "browser-url", uri: finalUrl },
            { id: `browser:text:${ctx.effect?.effectId ?? "work"}`, kind: "browser-dom-text", metadata: { text: String(bodyText ?? "").slice(0, 8000) } }
          ];
          return { status: "accepted", data: { finalUrl, outputs, bodyText, cdpPort: port }, externalEffectId: `browser:${finalUrl}`, evidence };
        } finally {
          session.close();
        }
      } catch (error) {
        lastError = `attempt ${launchAttempt}: ${String(error)}`;
      } finally {
        killBrowser(browser);
      }
    }

    return { status: "ambiguous", data: { reason: lastError } };
  }
}

class LocalBrowserVerifier implements Verifier {
  name = "pack.browser.text";
  async verify(ctx: any) {
    const expected = String(ctx.work.contract.inputs?.expectedText ?? "");
    const found = ctx.work.artifacts.find((a: any) => a.kind === "browser-dom-text");
    const text = String(found?.metadata?.text ?? "");
    const passed = expected.length > 0 ? text.includes(expected) : Boolean(found);
    return { id: ctx.criterion.id, criterion: ctx.criterion.description, passed, details: passed ? `Browser evidence contains expected text: ${expected}` : `Expected text not found: ${expected}`, evidence: found ? [found] : [] };
  }
}

export function registerLocalBrowserPack(registry: { register(c: Capability): void }, verification: { register(v: Verifier): void }): void {
  registry.register(new LocalBrowserCapability());
  verification.register(new LocalBrowserVerifier());
}
