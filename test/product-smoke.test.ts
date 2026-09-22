const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const os = require("os");
const path = require("path");
const childProcess = require("child_process");

const { JsonWorkRepository } = require("../packages/storage/src/json.js");
const { startStudio } = require("../apps/studio.js");

function tempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function fixture() {
  return {
    id: "product_smoke_restart",
    contract: {
      objective: "Product smoke persistence check",
      inputs: {},
      constraints: {},
      success: [{ id: "smoke", description: "persisted Work Object remains readable" }],
      deliverables: ["smoke-proof.json"],
      riskClass: "read",
      approvalRequired: false
    },
    status: "verified",
    effects: [{
      effectId: "smoke_effect",
      operation: "read",
      capability: "pack.local.read",
      riskClass: "read",
      status: "verified",
      attempts: 1,
      idempotencyKey: "internal-smoke-key"
    }],
    artifacts: [{ uri: "file:///tmp/smoke-proof.json", mediaType: "application/json" }],
    verification: {
      status: "verified",
      verifiedAt: "2026-09-22T00:00:00.000Z",
      checks: [{
        criterion: "persisted Work Object remains readable",
        status: "passed",
        details: "product smoke fixture",
        evidence: [{ kind: "observed", uri: "file:///tmp/smoke-proof.json" }]
      }]
    },
    events: [{
      id: "smoke_event",
      type: "work.verified",
      at: "2026-09-22T00:00:00.000Z",
      message: "Verified"
    }],
    createdAt: "2026-09-22T00:00:00.000Z",
    updatedAt: "2026-09-22T00:00:00.000Z"
  };
}

test("local product smoke boots Studio, reports release version, serves work, and survives restart", async () => {
  const root = tempDir("workproof-product-smoke-");
  const repository = new JsonWorkRepository(root);
  repository.save(fixture());

  const packageJson = JSON.parse(
    fs.readFileSync(path.resolve(path.dirname(__filename), "../../package.json"), "utf8")
  );
  assert.equal(packageJson.bin?.workctl, "dist/packages/cli/src/index.js");
  const compiledCli = fs.readFileSync(path.resolve(path.dirname(__filename), "../packages/cli/src/index.js"), "utf8");
  assert.match(compiledCli, /^#!\/usr\/bin\/env node\n/);

  const cliEntry = path.resolve(path.dirname(__filename), "../packages/cli/src/index.js");
  const cliHelp = childProcess.spawnSync(process.execPath, [cliEntry, "--help"], {
    cwd: require("process").cwd(),
    encoding: "utf8"
  });
  assert.equal(cliHelp.status, 0, cliHelp.stderr || cliHelp.stdout);
  assert.match(cliHelp.stdout, /resume <work-id> <mission.json>/);

  const cliVersion = childProcess.spawnSync(process.execPath, [cliEntry, "--version"], {
    cwd: require("process").cwd(),
    encoding: "utf8"
  });
  assert.equal(cliVersion.status, 0, cliVersion.stderr || cliVersion.stdout);
  assert.equal(cliVersion.stdout.trim(), packageJson.version);

  const first = await startStudio({ workDirectory: root, host: "127.0.0.1", port: 0 });
  try {
    const base = "http://" + first.host + ":" + first.port;

    const health = await fetch(base + "/health");
    assert.equal(health.status, 200);
    const healthBody = await health.json();
    assert.equal(healthBody.status, "ok");
    assert.equal(healthBody.version, packageJson.version);
    assert.equal(healthBody.mode, "read-only");

    const page = await fetch(base);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /WorkProof Studio/);

    const list = await fetch(base + "/api/work?status=verified&limit=10");
    assert.equal(list.status, 200);
    const listBody = await list.json();
    assert.equal(listBody.total, 1);
    assert.equal(listBody.work[0].id, "product_smoke_restart");
    assert.equal(listBody.work[0].status, "verified");
    assert.equal(listBody.work[0].riskClass, "read");
  } finally {
    await first.close();
  }

  const second = await startStudio({ workDirectory: root, host: "127.0.0.1", port: 0 });
  try {
    const base = "http://" + second.host + ":" + second.port;

    const health = await fetch(base + "/health");
    assert.equal(health.status, 200);
    assert.equal((await health.json()).version, packageJson.version);

    const detail = await fetch(base + "/api/work/product_smoke_restart");
    assert.equal(detail.status, 200);
    const body = await detail.json();
    assert.equal(body.work.id, "product_smoke_restart");
    assert.equal(body.work.status, "verified");
    assert.equal(body.work.effects[0].idempotencyKey, undefined);
    assert.equal(body.work.contract, undefined);
    assert.equal(body.work.inputs, undefined);
    assert.equal(body.work.constraints, undefined);
  } finally {
    await second.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});


test("workctl can resume a persisted Work Object after an interrupted run", () => {
  const root = tempDir("workproof-cli-resume-");
  try {
    const dataPath = path.join(root, "suppliers.json");
    const outputPath = path.join(root, "research.json");
    const proofPath = path.join(root, "proof.json");
    const missionPath = path.join(root, "mission.json");
    const cliPath = path.resolve(path.dirname(__filename), "../packages/cli/src/index.js");

    fs.writeFileSync(dataPath, JSON.stringify([
      { name: "Alpha", website: "https://alpha.example", phone: "0100000001", source: "fixture" },
      { name: "Beta", website: "https://beta.example", phone: "0100000002", source: "fixture" },
      { name: "Gamma", website: "https://gamma.example", phone: "0100000003", source: "fixture" },
      { name: "Delta", website: "https://delta.example", phone: "0100000004", source: "fixture" }
    ], null, 2));

    fs.writeFileSync(missionPath, JSON.stringify({
      objective: "Resume a persisted research outcome",
      inputs: { dataPath, outputPath, minRecords: 4 },
      success: [{
        id: "artifact",
        description: "At least four unique supplier records with required fields",
        verifier: "pack.research.artifact",
        required: true
      }],
      deliverables: [outputPath],
      riskClass: "read",
      steps: [{
        id: "research",
        operation: "research_suppliers",
        capability: "pack.research.local",
        input: { dataPath, outputPath, minRecords: 4 },
        idempotencyKey: "resume-smoke:research",
        riskClass: "read"
      }],
      proofPath,
      workDirectory: root
    }, null, 2));

    const run = childProcess.spawnSync(
      process.execPath,
      [cliPath, "run", missionPath],
      { cwd: require("process").cwd(), encoding: "utf8" }
    );
    assert.equal(run.status, 0, run.stderr || run.stdout);
    const firstResult = JSON.parse(run.stdout);
    assert.equal(firstResult.status, "verified");
    assert.equal(fs.existsSync(path.join(root, firstResult.id + ".json")), true);

    const persistedPath = path.join(root, firstResult.id + ".json");
    const persisted = JSON.parse(fs.readFileSync(persistedPath, "utf8"));
    persisted.status = "running";
    delete persisted.verification;
    persisted.events = Array.isArray(persisted.events)
      ? persisted.events.filter((event: any) => event.type !== "verification.completed")
      : [];
    fs.writeFileSync(persistedPath, JSON.stringify(persisted, null, 2), "utf8");

    const resume = childProcess.spawnSync(
      process.execPath,
      [cliPath, "resume", firstResult.id, missionPath],
      { cwd: require("process").cwd(), encoding: "utf8" }
    );
    assert.equal(resume.status, 0, resume.stderr || resume.stdout);
    const resumedResult = JSON.parse(resume.stdout);
    assert.equal(resumedResult.id, firstResult.id);
    assert.equal(resumedResult.status, "verified");
    assert.equal(fs.existsSync(proofPath), true);

    const after = JSON.parse(fs.readFileSync(persistedPath, "utf8"));
    assert.equal(after.status, "verified");
    assert.ok(after.verification);
    assert.equal(after.verification.status, "verified");
    assert.equal(after.effects.length, 1);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

export {};
