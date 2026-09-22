const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

function fail(message) {
  throw new Error(message);
}

async function main() {
  const packageRoot = path.resolve(process.argv[2] || "");
  if (!packageRoot || !fs.existsSync(packageRoot)) fail("Packed package root is required");

  const packageJson = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
  if (typeof packageJson.version !== "string" || !packageJson.version.trim()) fail("Packed package version is missing");

  const entry = path.join(packageRoot, "dist", "apps", "control-plane.js");
  if (!fs.existsSync(entry)) fail("Packed control-plane entrypoint is missing: " + entry);

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "workproof-packed-control-"));
  const child = spawn(process.execPath, [entry], {
    cwd: root,
    env: {
      ...process.env,
      WORKPROOF_CONTROL_PLANE_PORT: "0",
      WORKPROOF_WORK_DIRECTORY: path.join(root, "work-runs")
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

  try {
    const port = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Timed out waiting for packed control-plane startup: " + stdout)), 10000);
      const onData = () => {
        const match = /"port"\s*:\s*(\d+)/.exec(stdout);
        if (!match) return;
        clearTimeout(timer);
        child.stdout.off("data", onData);
        resolve(Number(match[1]));
      };
      child.stdout.on("data", onData);
      child.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once("exit", (code, signal) => {
        clearTimeout(timer);
        if (code !== 0) reject(new Error("Packed control-plane exited: code=" + code + " signal=" + signal + " stdout=" + stdout + " stderr=" + stderr));
      });
    });

    const base = "http://127.0.0.1:" + port;
    const health = await fetch(base + "/health");
    if (!health.ok) fail("Packed control-plane health failed with HTTP " + health.status);
    const healthBody = await health.json();
    if (healthBody.status !== "ok" || healthBody.version !== packageJson.version || healthBody.apiVersion !== "1.0") {
      fail("Packed control-plane health identity mismatch: " + JSON.stringify(healthBody));
    }

    const capabilities = await fetch(base + "/v1/capabilities");
    if (!capabilities.ok) fail("Packed control-plane capability inventory failed with HTTP " + capabilities.status);
    const capabilityBody = await capabilities.json();
    if (!Array.isArray(capabilityBody.capabilities) || !capabilityBody.capabilities.some((item) => item.name === "pack.local")) {
      fail("Packed control-plane capability inventory is incomplete");
    }

    process.stdout.write(JSON.stringify({
      status: "verified",
      packageVersion: packageJson.version,
      port,
      capabilityCount: capabilityBody.capabilities.length
    }, null, 2) + "\n");
  } finally {
    child.kill("SIGTERM");
    await new Promise((resolve) => child.once("exit", resolve));
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  process.stderr.write(String(error && error.stack ? error.stack : error) + "\n");
  process.exitCode = 1;
});
