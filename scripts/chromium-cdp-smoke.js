const { spawn } = require("child_process");
const { request } = require("http");
const { randomBytes } = require("crypto");

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
  const profile = `/tmp/workproof-cdp-smoke-${process.pid}-${randomBytes(4).toString("hex")}`;
  const browserBinary = process.env.WORKPROOF_BROWSER_BINARY || "chromium";
  const browser = spawn(browserBinary, [
    "--headless",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--remote-debugging-address=127.0.0.1",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "about:blank"
  ], { stdio: ["ignore", "pipe", "pipe"], detached: true });

  let output = "";
  const append = chunk => { output += chunk.toString(); };
  browser.stdout?.on("data", append);
  browser.stderr?.on("data", append);

  try {
    let port = null;
    for (let i = 0; i < 300; i++) {
      const match = /DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//.exec(output);
      if (match) {
        port = Number(match[1]);
        break;
      }
      if (browser.exitCode !== null) break;
      await wait(100);
    }
    if (!port) {
      throw new Error(output.trim() || "Chromium did not announce a DevTools endpoint within 30 seconds");
    }
    const version = await fetchJson(port, "/json/version");
    if (!version?.Browser || !version?.webSocketDebuggerUrl) {
      throw new Error("Chromium DevTools endpoint returned incomplete version metadata");
    }
    process.stdout.write(JSON.stringify({ status: "verified", browser: version.Browser, protocol: version["Protocol-Version"], port }) + "\n");
  } finally {
    browser.stdout?.off?.("data", append);
    browser.stderr?.off?.("data", append);
    try {
      const pid = browser.pid;
      if (pid) process.kill(-pid, "SIGKILL");
    } catch {
      try { browser.kill("SIGKILL"); } catch {}
    }
  }
}

main().catch(error => {
  process.stderr.write(String(error) + "\n");
  process.exitCode = 1;
});
