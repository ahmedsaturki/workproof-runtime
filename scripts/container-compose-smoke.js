const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

function run(command, args) {
  const result = spawnSync(command, args, { cwd: process.cwd(), encoding: "utf8", stdio: "pipe" });
  if (result.status !== 0) throw new Error(command + " " + args.join(" ") + " failed\nstdout:\n" + String(result.stdout || "") + "\nstderr:\n" + String(result.stderr || ""));
  return String(result.stdout || "");
}
async function getJson(url) {
  const response = await fetch(url);
  const raw = await response.text();
  let value;
  try { value = JSON.parse(raw); } catch { throw new Error("Invalid JSON from " + url); }
  if (!response.ok) throw new Error("HTTP " + response.status + " from " + url);
  return value;
}
async function waitForHealthy(baseUrl, version) {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      const body = await getJson(baseUrl + "/health");
      if (body.status === "ok" && body.version === version) return;
    } catch {}
    if (attempt === 30) throw new Error("Compose runtime did not become healthy with expected version");
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
async function main() {
  const packageJson = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf8"));
  const project = "workproof-compose-smoke-" + String(process.env.GITHUB_RUN_ID || Date.now());
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "workproof-compose-smoke-"));
  const dataDir = path.join(root, "work-runs");
  const overridePath = path.join(root, "compose.override.yaml");
  fs.mkdirSync(dataDir, { recursive: true });
  const fixture = {
    id: "compose_smoke",
    contract: { objective: "Production compose persistence smoke", inputs: {}, constraints: {}, success: [], deliverables: [], riskClass: "read", approvalRequired: false },
    status: "verified", effects: [], sagas: [], artifacts: [],
    verification: { status: "verified", checks: [], verifiedAt: "2026-09-22T00:00:00.000Z" },
    events: [], createdAt: "2026-09-22T00:00:00.000Z", updatedAt: "2026-09-22T00:00:00.000Z"
  };
  fs.writeFileSync(path.join(dataDir, "compose_smoke.json"), JSON.stringify(fixture, null, 2) + "\n", "utf8");
  const image = "ghcr.io/" + String(process.env.GITHUB_REPOSITORY || "ahmedsaturki/workproof-runtime").toLowerCase() + ":" + packageJson.version;
  fs.writeFileSync(overridePath, [
    "services:",
    "  workproof-studio:",
    "    image: " + image,
    "    volumes:",
    "      - " + JSON.stringify(dataDir + ":/data/work-runs")
  ].join("\n") + "\n", "utf8");
  const compose = ["compose", "-f", "compose.production.yaml", "-f", overridePath, "-p", project];
  const baseUrl = "http://127.0.0.1:8788";
  const renderedConfig = JSON.parse(run("docker", compose.concat(["config", "--format", "json"])));
  const service = renderedConfig?.services?.["workproof-studio"];
  if (!service) throw new Error("Production Compose did not render workproof-studio");
  if (service.init !== true) throw new Error("Production Compose must enable init");
  if (String(service.stop_grace_period) !== "10s") throw new Error("Production Compose must set a 10s stop grace period");
  if (Number(service.cpus) !== 1) throw new Error("Production Compose must cap the Studio service at 1 CPU");
  const memoryLimit = Number(service.mem_limit);
  if (!(memoryLimit === 1073741824 || memoryLimit === 1_000_000_000)) throw new Error("Production Compose must cap the Studio service at 1 GiB");
  if (Number(service.pids_limit) !== 512) throw new Error("Production Compose must cap the Studio service at 512 processes");
  const logging = service.logging || {};
  if (logging.driver !== "json-file") throw new Error("Production Compose must use bounded json-file logging");
  if (String(logging.options?.["max-size"]) !== "10m" || String(logging.options?.["max-file"]) !== "3") {
    throw new Error("Production Compose must configure 10m x 3 log rotation");
  }

  try {
    run("docker", compose.concat(["up", "-d", "--wait"]));
    await waitForHealthy(baseUrl, packageJson.version);
    const before = await getJson(baseUrl + "/api/work/compose_smoke");
    if (before.work?.status !== "verified") throw new Error("Persisted Work Object was not visible before restart");
    run("docker", compose.concat(["restart"]));
    await waitForHealthy(baseUrl, packageJson.version);
    const after = await getJson(baseUrl + "/api/work/compose_smoke");
    if (after.work?.status !== "verified") throw new Error("Persisted Work Object was not visible after restart");
    process.stdout.write(JSON.stringify({ status: "verified", project, version: packageJson.version, workId: "compose_smoke", restartPersistence: true }, null, 2) + "\n");
  } finally {
    try { run("docker", compose.concat(["down", "--remove-orphans"])); } catch {}
    fs.rmSync(root, { recursive: true, force: true });
  }
}
main().catch(error => { process.stderr.write(String(error) + "\n"); process.exitCode = 1; });
