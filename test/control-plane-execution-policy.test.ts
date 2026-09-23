const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const os = require("os");
const path = require("path");

import { CONTROL_PLANE_EXECUTION_POLICY, executeMission } from "../apps/control-plane";

test("control-plane mission executor enforces approval and risk policy before capability execution", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "workproof-control-policy-"));
  const previousWorkDirectory = process.env.WORKPROOF_WORK_DIRECTORY;
  const previousAllowedRoots = process.env.WORKPROOF_CONTROL_PLANE_ALLOWED_ROOTS;
  process.env.WORKPROOF_WORK_DIRECTORY = root;
  process.env.WORKPROOF_CONTROL_PLANE_ALLOWED_ROOTS = root;

  try {
    assert.equal(CONTROL_PLANE_EXECUTION_POLICY.maxRisk, "external_write");
    assert.equal(CONTROL_PLANE_EXECUTION_POLICY.approved, false);

    const work = await executeMission({
      objective: "approval must block control-plane execution",
      success: [],
      deliverables: [],
      riskClass: "local_write",
      approvalRequired: true,
      steps: [{
        id: "write",
        operation: "create_file",
        capability: "pack.local.file.create",
        input: { path: path.join(root, "should-not-exist.txt"), content: "blocked" },
        idempotencyKey: "control-policy.approval",
        riskClass: "local_write"
      }]
    });

    assert.equal(work.status, "failed");
    assert.equal(fs.existsSync(path.join(root, "should-not-exist.txt")), false);
    const lastEvent = work.events.at(-1);
    if (!lastEvent) throw new Error("Expected a policy-blocked event");
    assert.match(lastEvent.message, /Policy blocked step .*Work contract requires approval/);
  } finally {
    if (previousWorkDirectory === undefined) delete process.env.WORKPROOF_WORK_DIRECTORY;
    else process.env.WORKPROOF_WORK_DIRECTORY = previousWorkDirectory;
    if (previousAllowedRoots === undefined) delete process.env.WORKPROOF_CONTROL_PLANE_ALLOWED_ROOTS;
    else process.env.WORKPROOF_CONTROL_PLANE_ALLOWED_ROOTS = previousAllowedRoots;
    fs.rmSync(root, { recursive: true, force: true });
  }
});


test("control-plane resume path keeps the same execution policy", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "workproof-control-policy-resume-"));
  const previousWorkDirectory = process.env.WORKPROOF_WORK_DIRECTORY;
  const previousAllowedRoots = process.env.WORKPROOF_CONTROL_PLANE_ALLOWED_ROOTS;
  process.env.WORKPROOF_WORK_DIRECTORY = root;
  process.env.WORKPROOF_CONTROL_PLANE_ALLOWED_ROOTS = root;

  try {
    const work = await executeMission({
      objective: "resume policy must not bypass approval",
      success: [],
      deliverables: [],
      riskClass: "local_write",
      approvalRequired: false,
      steps: [{
        id: "write",
        operation: "create_file",
        capability: "pack.local.file.create",
        input: { path: path.join(root, "resume-policy.txt"), content: "initial" },
        idempotencyKey: "control-policy.resume",
        riskClass: "local_write"
      }]
    });

    assert.equal(work.status, "unverifiable");
    const persistedPath = path.join(root, work.id + ".json");
    const persisted = JSON.parse(fs.readFileSync(persistedPath, "utf8"));
    persisted.status = "running";
    persisted.contract.approvalRequired = true;
    delete persisted.verification;
    fs.writeFileSync(persistedPath, JSON.stringify(persisted, null, 2), "utf8");

    const resumedInput = JSON.parse(fs.readFileSync(persistedPath, "utf8"));
    const { resumeMission } = require("../apps/control-plane");
    const resumed = await resumeMission(resumedInput);

    assert.equal(resumed.status, "failed");
    const lastEvent = resumed.events.at(-1);
    if (!lastEvent) throw new Error("Expected a policy-blocked resume event");
    assert.match(lastEvent.message, /Policy blocked step .*Work contract requires approval/);
  } finally {
    if (previousWorkDirectory === undefined) delete process.env.WORKPROOF_WORK_DIRECTORY;
    else process.env.WORKPROOF_WORK_DIRECTORY = previousWorkDirectory;
    if (previousAllowedRoots === undefined) delete process.env.WORKPROOF_CONTROL_PLANE_ALLOWED_ROOTS;
    else process.env.WORKPROOF_CONTROL_PLANE_ALLOWED_ROOTS = previousAllowedRoots;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("control-plane local capabilities reject paths outside the work root", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "workproof-control-path-"));
  const previousWorkDirectory = process.env.WORKPROOF_WORK_DIRECTORY;
  const previousAllowedRoots = process.env.WORKPROOF_CONTROL_PLANE_ALLOWED_ROOTS;
  process.env.WORKPROOF_WORK_DIRECTORY = root;
  process.env.WORKPROOF_CONTROL_PLANE_ALLOWED_ROOTS = root;
  try {
    const caught = await Promise.resolve()
      .then(() => executeMission({
        objective: "reject outside-root read",
        success: [],
        deliverables: [],
        riskClass: "read",
        steps: [{
          id: "read-outside-root",
          operation: "read_file",
          capability: "pack.local.file.read",
          input: { path: "/etc/hostname" },
          idempotencyKey: "control-policy.outside-root",
          riskClass: "read"
        }]
      }))
      .then(() => undefined, (error: unknown) => error);
    assert.ok(caught, "Expected outside-root capability path rejection");
    assert.match(String(caught instanceof Error ? caught.message : caught), /outside configured roots/);
  } finally {
    if (previousWorkDirectory === undefined) delete process.env.WORKPROOF_WORK_DIRECTORY;
    else process.env.WORKPROOF_WORK_DIRECTORY = previousWorkDirectory;
    if (previousAllowedRoots === undefined) delete process.env.WORKPROOF_CONTROL_PLANE_ALLOWED_ROOTS;
    else process.env.WORKPROOF_CONTROL_PLANE_ALLOWED_ROOTS = previousAllowedRoots;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

export {};
