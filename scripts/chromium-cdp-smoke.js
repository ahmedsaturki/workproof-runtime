const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const { request } = require("http");
const { randomBytes } = require("crypto");
const os = require("os");
const path = require("path");
const net = require("net");
const platform = process.platform;

function resolveBrowserBinary() {
  const explicit = process.env.WORKPROOF_BROWSER_BINARY?.trim();
  if (explicit) return explicit;
  const candidates = platform === "win32"
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
  for (const candidate of candidates) {
    if (path.isAbsolute(candidate) && !require("fs").existsSync(candidate)) continue;
    try {
      if (spawnSync(candidate, ["--version"], { stdio: "ignore", windowsHide: true }).status === 0) return candidate;
    } catch {}
  }
  throw new Error("No supported Chromium executable was found");
}

async function findFreeLoopbackPort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const port = address && typeof address === "object" ? address.port : 0;
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  if (!port) throw new Error("Unable to allocate loopback port");
  return port;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchJson(port, path) {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: "127.0.0.1", port, path, method: "GET" }, res => {
      let raw = "";
      res.on("data", chunk => { raw += chunk.toString(); });
      res.on("end", () => {
        try { resolve(JSON.parse(raw)); }
        catch (error) { reject(error); }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

async function main() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), `workproof-cdp-smoke-${process.pid}-${randomBytes(4).toString("hex")}-`));
  const browserBinary = resolveBrowserBinary();
  const port = await findFreeLoopbackPort();
  const browser = spawn(browserBinary, [
    "--headless",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--remote-debugging-address=127.0.0.1",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    "about:blank"
  ], { stdio: ["ignore", "pipe", "pipe"], detached: true });

  try {
    let ready = false;
    for (let i = 0; i < 300; i++) {
      try {
        const version = await fetchJson(port, "/json/version");
        if (version?.Browser && version?.webSocketDebuggerUrl) {
          ready = true;
      
          break;
        }
      } catch {}
      if (browser.exitCode !== null) break;
      await wait(100);
    }
    if (!ready) {
      throw new Error("Chromium DevTools endpoint did not become ready within 30 seconds");
    }
  } catch (error) {
    throw error;
  }
    if (!version?.Browser || !version?.webSocketDebuggerUrl) {
      throw new Error("Chromium DevTools endpoint returned incomplete version metadata");
    }
    process.stdout.write(JSON.stringify({ status: "verified", browser: version.Browser, protocol: version["Protocol-Version"], port }) + "\n");
  } finally {
    try {
      const pid = browser.pid;
      if (pid && platform !== "win32") process.kill(-pid, "SIGKILL");
      else browser.kill("SIGKILL");
    } catch {
      try { browser.kill("SIGKILL"); } catch {}
    }
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  }
}

main().catch(error => {
  process.stderr.write(String(error) + "\n");
  process.exitCode = 1;
});
