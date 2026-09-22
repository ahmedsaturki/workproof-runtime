const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

async function waitForPort(child: any): Promise<number> {
  return new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => reject(new Error(`control-plane startup timeout: ${output}`)), 10000);
    const onData = (chunk: any) => {
      output += chunk.toString();
      const match = /"port"\s*:\s*(\d+)/.exec(output);
      if (!match) return;
      clearTimeout(timer);
      child.stdout.off("data", onData);
      resolve(Number(match[1]));
    };
    child.stdout.on("data", onData);
    child.once("error", (error: unknown) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", (code: number, signal: string) => {
      if (code !== 0) {
        clearTimeout(timer);
        reject(new Error(`control-plane exited during startup: code=${code} signal=${signal} output=${output}`));
      }
    });
  });
}

test("packaged control-plane process serves health, executes work, persists proof, and replays idempotently", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "workproof-control-app-"));
  const outputFile = path.join(root, "output.txt");
  const child = spawn(process.execPath, [path.resolve("dist/apps/control-plane.js")], {
    env: {
      ...process.env,
      WORKPROOF_CONTROL_PLANE_PORT: "0",
      WORKPROOF_WORK_DIRECTORY: path.join(root, "work-runs")
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stderr = "";
  child.stderr.on("data", (chunk: any) => { stderr += chunk.toString(); });

  try {
    const port = await waitForPort(child);
    const baseUrl = `http://127.0.0.1:${port}`;
    const packageJson = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf8"));
    const health = await fetch(`${baseUrl}/health`);
    assert.equal(health.status, 200);
    const healthBody = await health.json();
    assert.equal(healthBody.status, "ok");
    assert.equal(healthBody.version, packageJson.version);
    assert.equal(healthBody.apiVersion, "1.0");

    const ready = await fetch(`${baseUrl}/ready`);
    assert.equal(ready.status, 200);
    const readyBody = await ready.json();
    assert.equal(readyBody.status, "ready");
    assert.equal(readyBody.checks.repository.status, "ok");
    assert.equal(readyBody.checks.idempotency.status, "ok");

    const capabilities = await fetch(`${baseUrl}/v1/capabilities`);
    assert.equal(capabilities.status, 200);
    const capabilityBody = await capabilities.json();
    assert.ok(Array.isArray(capabilityBody.capabilities));
    assert.ok(capabilityBody.capabilities.some((item: any) => item.name === "pack.local.file.read"));

    const dispatch = {
      objective: "control-plane app smoke",
      riskClass: "local_write",
      deliverables: ["file"],
      steps: [{
        id: "create",
        operation: "create_file",
        capability: "pack.local.file.create",
        riskClass: "local_write",
        idempotencyKey: "control-plane-app-create-1",
        input: { path: outputFile, content: "verified" }
      }]
    };

    const first = await fetch(`${baseUrl}/v1/work/dispatch`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "control-plane-dispatch-1" },
      body: JSON.stringify(dispatch)
    });
    assert.equal(first.status, 200);
    const firstBody = await first.json();
    assert.equal(firstBody.work.contract.objective, dispatch.objective);
    assert.ok(fs.existsSync(outputFile));
    assert.equal(fs.readFileSync(outputFile, "utf8"), "verified");

    const second = await fetch(`${baseUrl}/v1/work/dispatch`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "control-plane-dispatch-1" },
      body: JSON.stringify(dispatch)
    });
    assert.equal(second.status, 200);
    assert.equal(second.headers.get("x-idempotency-replayed"), "true");
    const secondBody = await second.json();
    assert.equal(secondBody.work.id, firstBody.work.id);

    const loaded = await fetch(`${baseUrl}/v1/work/${firstBody.work.id}`);
    assert.equal(loaded.status, 200);
    assert.equal((await loaded.json()).work.id, firstBody.work.id);

    const proofPath = path.join(root, "work-runs", "proofs", `${firstBody.work.id}.json`);
    assert.ok(fs.existsSync(proofPath));
    const proof = JSON.parse(fs.readFileSync(proofPath, "utf8"));
    assert.equal(proof.work.id, firstBody.work.id);
    assert.ok(proof.integrity?.digest);
  } finally {
    child.kill("SIGTERM");
    await new Promise<void>((resolve) => child.once("exit", () => resolve()));
    fs.rmSync(root, { recursive: true, force: true });
    assert.equal(stderr, "", stderr);
  }
});

export {};
