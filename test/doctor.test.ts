const assert = require("assert");
const test = require("node:test");
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
import { runDoctor } from "../packages/doctor/src/index";

async function server(handler: any): Promise<{ base: string; close(): Promise<void> }> {
  const instance = http.createServer(handler);
  await new Promise<void>(resolve => instance.listen(0, "127.0.0.1", resolve));
  const address = instance.address();
  if (!address || typeof address === "string") throw new Error("test server did not bind");
  const port = address.port;
  return {
    base: "http://127.0.0.1:" + port,
    close: () => new Promise(resolve => instance.close(() => resolve()))
  };
}

function checkState(report: any, id: string): string {
  const item = report.checks.find((check: any) => check.id === id);
  assert.ok(item, "missing doctor check: " + id);
  return item.state;
}

test("doctor reports a healthy local installation and connected services", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "workproof-doctor-"));
  fs.mkdirSync(path.join(root, "work-runs"), { recursive: true });

  const control = await server((req: any, res: any) => {
    const body = req.url === "/health"
      ? { status: "ok", version: "3.8.0-dev.1" }
      : { status: "ready", checks: { repository: { status: "ok" }, idempotency: { status: "ok" } } };
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  });
  const studio = await server((req: any, res: any) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ version: "3.0", work: { total: 1 } }));
  });
  const a2a = await server((req: any, res: any) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ name: "WorkProof Runtime", supportedInterfaces: [{ url: "http://127.0.0.1/rpc" }] }));
  });

  try {
    const report = await runDoctor({
      WORKPROOF_WORK_DIRECTORY: path.join(root, "work-runs"),
      WORKPROOF_PACKAGE_ROOT: require("process").cwd(),
      WORKPROOF_CONTROL_PLANE_URL: control.base,
      WORKPROOF_STUDIO_URL: studio.base,
      WORKPROOF_A2A_URL: a2a.base
    });
    assert.equal(report.status, "ready");
    assert.equal(checkState(report, "work-directory"), "ok");
    assert.equal(checkState(report, "control-plane-health"), "ok");
    assert.equal(checkState(report, "control-plane-readiness"), "ok");
    assert.equal(checkState(report, "studio-health"), "ok");
    assert.equal(checkState(report, "a2a-agent-card"), "ok");
  } finally {
    await control.close();
    await studio.close();
    await a2a.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("doctor fails when a configured service is unavailable", async () => {
  const report = await runDoctor({
    WORKPROOF_CONTROL_PLANE_URL: "http://127.0.0.1:1"
  });
  assert.equal(report.status, "failed");
  assert.equal(checkState(report, "control-plane-health"), "failed");
  assert.equal(checkState(report, "control-plane-readiness"), "failed");
  assert.equal(checkState(report, "studio-health"), "skipped");
  assert.equal(checkState(report, "a2a-agent-card"), "skipped");
});

export {};
