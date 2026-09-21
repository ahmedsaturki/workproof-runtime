const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const path = require("path");
const { spawnSync, spawn } = require("child_process");
const http = require("http");

function runCli(...args: string[]) {
  const cli = path.resolve("dist/packages/cli/src/index.js");
  return spawnSync(require("process").execPath, [cli, ...args], { encoding: "utf8" });
}

test("CLI manages registry auth policy and emits a token only at issuance time", () => {
  const dir = "/tmp/workproof-registry-auth-cli";
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const policyPath = path.join(dir, "registry-auth.json");

  const init = runCli("registry-auth-init", policyPath);
  assert.equal(init.status, 0);
  assert.match(init.stdout, /initialized/);
  assert.equal(fs.statSync(policyPath).mode & 0o777, 0o600);

  const added = runCli("registry-auth-add", policyPath, "team-reader", "read", "team-a", "reader");
  assert.equal(added.status, 0);
  const issued = JSON.parse(added.stdout);
  assert.equal(issued.credentialId, "team-reader");
  assert.deepEqual(issued.permissions, ["read"]);
  assert.equal(issued.namespace, "team-a");
  assert.match(issued.token, /^[A-Za-z0-9._~-]+$/);

  const policyText = fs.readFileSync(policyPath, "utf8");
  assert.equal(policyText.includes(issued.token), false);
  assert.equal(policyText.includes('"secretHash"'), true);

  const listed = runCli("registry-auth-list", policyPath);
  assert.equal(listed.status, 0);
  assert.match(listed.stdout, /team-reader/);
  assert.equal(listed.stdout.includes(issued.token), false);

  const revoked = runCli("registry-auth-revoke", "team-reader", policyPath, "rotation");
  assert.equal(revoked.status, 0);
  assert.match(revoked.stdout, /"status": "revoked"/);

  const listedAfter = JSON.parse(runCli("registry-auth-list", policyPath).stdout);
  assert.equal(listedAfter.length, 1);
  assert.ok(listedAfter[0].revokedAt);
});

test("CLI rejects duplicate registry credential IDs", () => {
  const dir = "/tmp/workproof-registry-auth-cli-duplicate";
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const policyPath = path.join(dir, "registry-auth.json");

  assert.equal(runCli("registry-auth-init", policyPath).status, 0);
  assert.equal(runCli("registry-auth-add", policyPath, "same-id", "read").status, 0);
  const duplicate = runCli("registry-auth-add", policyPath, "same-id", "read");
  assert.equal(duplicate.status, 1);
  assert.match(duplicate.stderr, /already exists/i);
});

export {};

test("registry server entrypoint loads an auth policy file and enforces it end-to-end", async () => {
  const dir = "/tmp/workproof-registry-server-auth";
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const policyPath = path.join(dir, "registry-auth.json");
  const vaultPath = path.join(dir, "vault");

  assert.equal(runCli("registry-auth-init", policyPath).status, 0);
  const add = runCli("registry-auth-add", policyPath, "server-reader", "read");
  assert.equal(add.status, 0);
  const token = JSON.parse(add.stdout).token;

  const child = spawn(require("process").execPath, [
    path.resolve("dist/apps/registry-server.js"),
    vaultPath,
    "0",
    "127.0.0.1",
    policyPath
  ], { stdio: ["ignore", "pipe", "pipe"] });

  const output = [];
  const start = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("registry server startup timed out")), 5000);
    child.stdout.on("data", (chunk) => {
      output.push(chunk.toString());
      const joined = output.join("");
      try {
        const info = JSON.parse(joined);
        clearTimeout(timer);
        resolve(info);
      } catch {}
    });
    child.stderr.on("data", (chunk) => {
      if (String(chunk).trim()) reject(new Error(String(chunk)));
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code !== null && code !== 0) reject(new Error(`registry server exited: ${code}`));
    });
  });

  try {
    const info = await start;
    assert.match(info.registry, /^http:\/\/127\.0\.0\.1:\d+$/);
    const port = Number(info.registry.split(":").pop());

    const unauthorized = await new Promise((resolve, reject) => {
      const req = http.get({ host: "127.0.0.1", port, path: "/v1/proofs" }, (res) => {
        res.resume();
        res.on("end", () => resolve(res.statusCode));
      });
      req.on("error", reject);
    });
    assert.equal(unauthorized, 401);

    const authorized = await new Promise((resolve, reject) => {
      const req = http.get({
        host: "127.0.0.1",
        port,
        path: "/v1/proofs",
        headers: { authorization: `Bearer ${token}` }
      }, (res) => {
        res.resume();
        res.on("end", () => resolve(res.statusCode));
      });
      req.on("error", reject);
    });
    assert.equal(authorized, 200);
  } finally {
    child.kill("SIGTERM");
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
