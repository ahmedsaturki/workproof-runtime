import { Capability, CapabilityReceipt, EvidenceRef, Verifier } from "../../core/src/types";
const { spawn } = require("child_process");
const { request: httpRequest } = require("http");
const { randomBytes } = require("crypto");

interface BrowserAction { type: "navigate" | "fill" | "click" | "get_text"; selector?: string; value?: string; url?: string; }
export interface BrowserWorkflowInput { startUrl: string; actions: BrowserAction[]; expectedText?: string; html?: string; cdpPort?: number; }

function isAllowedBrowserUrl(value: string): boolean {
  try {
    const u = new URL(value);
    if (u.protocol === "about:" && u.href === "about:blank") return true;
    return u.protocol === "http:" && (u.hostname === "127.0.0.1" || u.hostname === "localhost");
  } catch { return false; }
}

function cdpHttp(port: number, pathname: string, method = "GET"): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = httpRequest({ hostname: "127.0.0.1", port, path: pathname, method }, (res: any) => {
      let raw = "";
      res.on("data", (c: any) => raw += c.toString());
      res.on("end", () => {
        try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); }
      });
    });
    req.on("error", reject); req.end();
  });
}

async function connectCdp(port: number): Promise<{ ws: WebSocket; close: () => void }> {
  const list = await cdpHttp(port, "/json/list");
  const target = list.find((x: any) => x.type === "page");
  if (!target?.webSocketDebuggerUrl) throw new Error("No Chromium CDP page target available");
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise<void>((resolve, reject) => {
    ws.addEventListener("open", () => resolve(), { once: true });
    ws.addEventListener("error", () => reject(new Error("CDP websocket connection failed")), { once: true });
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

function choosePort(): number { return 9300 + (randomBytes(2).readUInt16BE(0) % 500); }

function ensureBrowser(port: number): any {
  return spawn("chromium", ["--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/operational-reality-chromium-${port}`, "about:blank"], { stdio: ["ignore", "ignore", "ignore"] });
}

class LocalBrowserCapability implements Capability {
  name = "pack.browser.local";
  version = "0.1.0";
  operations = ["browser_workflow"];
  riskClass = "local_write" as const;

  async execute(request: any, ctx: any): Promise<CapabilityReceipt> {
    const input = request.input as BrowserWorkflowInput;
    if (!isAllowedBrowserUrl(input.startUrl)) return { status: "rejected", data: { reason: "Only local HTTP or HTML data-page targets are allowed by the local pack" } };
    const port = input.cdpPort ?? choosePort();
    const browser = ensureBrowser(port);
    try { browser.unref?.(); } catch {}
    try {
      let ready = false;
      for (let i = 0; i < 30; i++) { try { await cdpHttp(port, "/json/list"); ready = true; break; } catch { await new Promise(r => setTimeout(r, 100)); } }
      if (!ready) return { status: "ambiguous", data: { reason: "Chromium CDP did not become ready" } };
      const session = await connectCdp(port);
      const ws = session.ws as WebSocket & { call?: (m: string, p?: any) => Promise<any> };
      try {
        await ws.call!("Page.enable"); await ws.call!("Runtime.enable");
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
              await ws.call!("Page.navigate", { url: action.url }); if (!(await waitFor(ws, "document.readyState === 'complete'"))) throw new Error("Navigated page did not become ready"); outputs.push({ type: action.type, url: action.url }); break;
            case "fill":
              if (!action.selector) throw new Error("fill requires selector");
              if (!(await waitFor(ws, `Boolean(document.querySelector(${JSON.stringify(action.selector)}))`))) throw new Error(`fill target not found: ${action.selector}`);
              await evaluate(ws, `(()=>{const e=document.querySelector(${JSON.stringify(action.selector)}); if(!e) throw new Error('not found'); e.focus(); e.value=${JSON.stringify(action.value ?? "")}; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); return e.value;})()`); outputs.push({ type: action.type, selector: action.selector }); break;
            case "click":
              if (!action.selector) throw new Error("click requires selector");
              if (!(await waitFor(ws, `Boolean(document.querySelector(${JSON.stringify(action.selector)}))`))) throw new Error(`click target not found: ${action.selector}`);
              await evaluate(ws, `(()=>{const e=document.querySelector(${JSON.stringify(action.selector)}); if(!e) throw new Error('not found'); e.click(); return true;})()`); if (!(await waitFor(ws, "document.readyState === 'complete'"))) throw new Error("Page did not settle after click"); outputs.push({ type: action.type, selector: action.selector }); break;
            case "get_text":
              if (!action.selector) throw new Error("get_text requires selector");
              if (!(await waitFor(ws, `Boolean(document.querySelector(${JSON.stringify(action.selector)}))`))) throw new Error(`text target not found: ${action.selector}`);
              outputs.push({ type: action.type, text: await evaluate(ws, `(()=>{const e=document.querySelector(${JSON.stringify(action.selector)}); return e ? e.textContent : null;})()`) }); break;
          }
        }
        const finalUrl = await evaluate(ws, "location.href");
        const bodyText = await evaluate(ws, "document.body ? document.body.innerText : ''");
        const evidence: EvidenceRef[] = [
          { id: `browser:url:${finalUrl}`, kind: "browser-url", uri: finalUrl },
          { id: `browser:text:${ctx.effect?.effectId ?? "work"}`, kind: "browser-dom-text", metadata: { text: String(bodyText ?? "").slice(0, 8000) } }
        ];
        return { status: "accepted", data: { finalUrl, outputs, bodyText }, externalEffectId: `browser:${finalUrl}`, evidence };
      } finally { session.close(); }
    } catch (error) {
      return { status: "ambiguous", data: { error: String(error) } };
    } finally { try { browser.kill(); } catch {} }
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
