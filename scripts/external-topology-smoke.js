const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

function run(command, args, allowFailure = false) {
  const result = spawnSync(command, args, { cwd: process.cwd(), encoding: "utf8", stdio: "pipe" });
  if (result.error) throw result.error;
  if (!allowFailure && result.status !== 0) {
    throw new Error(command + " " + args.join(" ") + " failed\nstdout:\n" + String(result.stdout || "") + "\nstderr:\n" + String(result.stderr || ""));
  }
  return { status: result.status ?? 0, stdout: String(result.stdout || ""), stderr: String(result.stderr || "") };
}

function requireCommand(command) {
  const result = run("sh", ["-lc", "command -v " + command], true);
  if (result.status !== 0) throw new Error("Required host command is unavailable: " + command);
}

function curlJson(url, user, password) {
  const result = run("curl", ["-ksS", "--user", user + ":" + password, url]);
  try { return JSON.parse(result.stdout); } catch { throw new Error("Invalid JSON from " + url + ": " + result.stdout); }
}

function curlStatus(url, user, password) {
  return Number(run("curl", ["-ksS", "-o", "/dev/null", "-w", "%{http_code}", "--user", user + ":" + password, url]).stdout.trim());
}

function waitHealthy(baseUrl, version, user, password) {
  for (let attempt = 1; attempt <= 45; attempt += 1) {
    try {
      const status = curlStatus(baseUrl + "/health", user, password);
      if (status === 200) {
        const body = curlJson(baseUrl + "/health", user, password);
        if (body.status === "ok" && body.version === version) return body;
      }
    } catch {}
    run("sleep", ["1"]);
  }
  throw new Error("External topology did not become healthy with expected version " + version);
}
function imageFromCompose(composePath) {
  const text = fs.readFileSync(composePath, "utf8");
  const match = text.match(/image:\s+([\w./:-]+@sha256:[0-9a-f]{64})/);
  if (!match) throw new Error("Pinned WorkProof image missing from compose.production.yaml");
  return match[1];
}

function fixture() {
  return {
    id: "external_topology_smoke",
    contract: { objective: "Disposable external topology persistence smoke", inputs: {}, constraints: {}, success: [], deliverables: [], riskClass: "read", approvalRequired: false },
    status: "verified", effects: [], sagas: [], artifacts: [],
    verification: { status: "verified", checks: [], verifiedAt: "2026-09-22T00:00:00.000Z" },
    events: [], createdAt: "2026-09-22T00:00:00.000Z", updatedAt: "2026-09-22T00:00:00.000Z"
  };
}

async function main() {
  ["docker", "openssl", "htpasswd", "curl", "tar"].forEach(requireCommand);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "workproof-external-smoke-"));
  const dataDir = path.join(root, "work-runs");
  const tlsDir = path.join(root, "tls");
  const edgeDir = path.join(root, "edge");
  const authPath = path.join(edgeDir, ".htpasswd");
  const nginxPath = path.join(edgeDir, "nginx.conf");
  const backupPath = path.join(root, "backup.tgz");
  const runId = String(process.env.GITHUB_RUN_ID || Date.now());
  const network = "workproof-external-" + runId;
  const appName = network + "-app";
  const edgeName = network + "-edge";
  const packageJson = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf8"));
  const lineage = JSON.parse(fs.readFileSync(path.resolve("docs/release-lineage.json"), "utf8"));
  const productionImage = imageFromCompose(path.resolve("compose.production.yaml"));
  const expectedImage = lineage.container.image + "@" + lineage.container.digest;
  if (productionImage !== expectedImage) throw new Error("Compose image does not match release-lineage.json");
  const rollbackImage = "ghcr.io/ahmedsaturki/workproof-runtime:" + lineage.rollback.commit;
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(tlsDir, { recursive: true });
  fs.mkdirSync(edgeDir, { recursive: true });

  const work = fixture();
  fs.writeFileSync(path.join(dataDir, work.id + ".json"), JSON.stringify(work, null, 2) + "\n", "utf8");

  const password = "smoke-" + runId;
  const auth = run("htpasswd", ["-Bbn", "smoke", password]);
  fs.writeFileSync(authPath, auth.stdout, { encoding: "utf8", mode: 0o600 });
  if (auth.stdout.includes(password)) throw new Error("Raw authentication secret leaked into htpasswd file");

  run("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", path.join(tlsDir, "tls.key"), "-out", path.join(tlsDir, "tls.crt"), "-days", "1", "-subj", "/CN=localhost", "-addext", "subjectAltName=DNS:localhost,IP:127.0.0.1"]);

  const nginxConfig = ["events {}", "http {", "  server {", "    listen 8443 ssl;", "    server_name localhost;", "    ssl_certificate /etc/nginx/tls/tls.crt;", "    ssl_certificate_key /etc/nginx/tls/tls.key;", "    auth_basic \"WorkProof\";", "    auth_basic_user_file /etc/nginx/auth/.htpasswd;", "    location / {", "      proxy_pass http://workproof-app:8788;", "      proxy_set_header Host $host;", "      proxy_set_header X-Forwarded-Proto https;", "    }", "  }", "}"].join("\n") + "\n";
  fs.writeFileSync(nginxPath, nginxConfig, "utf8");

  const cleanup = [];
  const remove = name => run("docker", ["rm", "-f", name], true);
  try {
    run("docker", ["network", "create", network]);
    cleanup.push(() => run("docker", ["network", "rm", network], true));

    run("docker", ["run", "-d", "--name", appName, "--network", network, "-v", dataDir + ":/data/work-runs", productionImage, "sh", "-c", "node dist/apps/studio.js /data/work-runs 8788 0.0.0.0"]);
    cleanup.push(() => remove(appName));

    run("docker", ["run", "-d", "--name", edgeName, "--network", network, "-p", "127.0.0.1:9443:8443", "-v", tlsDir + ":/etc/nginx/tls:ro", "-v", authPath + ":/etc/nginx/auth/.htpasswd:ro", "-v", nginxPath + ":/etc/nginx/nginx.conf:ro", "nginx:1.27-alpine"]);
    cleanup.push(() => remove(edgeName));

    const baseUrl = "https://127.0.0.1:9443";
    const basic = "Basic " + Buffer.from("smoke:" + password).toString("base64");
    const unauthorizedStatus = Number(run("curl", ["-ksS", "-o", "/dev/null", "-w", "%{http_code}", baseUrl + "/health"]).stdout.trim());
    if (unauthorizedStatus !== 401) throw new Error("Expected unauthenticated edge request to return 401, got " + unauthorizedStatus);
    waitHealthy(baseUrl, packageJson.version, "smoke", password);

    const workValue = curlJson(baseUrl + "/api/work/" + work.id, "smoke", password);
    if (workValue.work?.status !== "verified") throw new Error("Authenticated Work Object was not readable through TLS/auth edge");
    if (JSON.stringify(workValue).includes(password)) throw new Error("Raw secret leaked into Work Object response");

    run("tar", ["-C", dataDir, "-czf", backupPath, "."]);
    if (!fs.existsSync(backupPath) || fs.statSync(backupPath).size === 0) throw new Error("Backup archive was not created");

    remove(appName);
    fs.rmSync(dataDir, { recursive: true, force: true });
    fs.mkdirSync(dataDir, { recursive: true });
    run("tar", ["-C", dataDir, "-xzf", backupPath]);

    run("docker", ["run", "-d", "--name", appName, "--network", network, "-v", dataDir + ":/data/work-runs", productionImage, "sh", "-c", "node dist/apps/studio.js /data/work-runs 8788 0.0.0.0"]);
    waitHealthy(baseUrl, packageJson.version, "smoke", password);
    const restored = curlJson(baseUrl + "/api/work/" + work.id, "smoke", password);
    if (restored.work?.status !== "verified") throw new Error("Backup/restore did not preserve authoritative work");

    remove(appName);
    run("docker", ["run", "-d", "--name", appName, "--network", network, "-v", dataDir + ":/data/work-runs", rollbackImage, "sh", "-c", "node dist/apps/studio.js /data/work-runs 8788 0.0.0.0"]);
    waitHealthy(baseUrl, lineage.rollback.version, "smoke", password);
    const rolled = curlJson(baseUrl + "/api/work/" + work.id, "smoke", password);
    if (rolled.work?.status !== "verified") throw new Error("Rollback image did not preserve readable authoritative work");

    process.stdout.write(JSON.stringify({ status: "verified", releaseVersion: packageJson.version, releaseCommit: lineage.release.commit, image: productionImage, rollbackImage, tls: true, authentication: true, secretNonLeakage: true, persistence: true, backupRestore: true, rollback: true, denyByDefaultEdge: true, workId: work.id }, null, 2) + "\n");
  } finally {
    for (const fn of cleanup.reverse()) { try { fn(); } catch {} }
    try { fs.rmSync(root, { recursive: true, force: true }); } catch {}
  }
}

main().catch(error => { process.stderr.write(String(error && error.stack ? error.stack : error) + "\n"); process.exitCode = 1; });
