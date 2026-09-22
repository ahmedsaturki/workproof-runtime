const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const os = require("os");
const path = require("path");

import { CONTROL_PLANE_EXECUTION_POLICY, executeMission } from "../apps/control-plane";

test("control-plane mission executor enforces approval and risk policy before capability execution", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "workproof-control-policy-"));
  const previousWorkDirectory = process.env.WORKPROOF_WORK_DIRECTORY;
  process.env.WORKPROOF_WORK_DIRECTORY = root;

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
        operation: "write_file",
        capability: "pack.local.write",
        input: { path: path.join(root, "should-not-exist.txt"), content: "blocked" },
        idempotencyKey: "control-policy:approval",
        riskClass: "local_write"
      }]
    });

    assert.equal(work.status, "failed");
    assert.equal(fs.existsSync(path.join(root, "should-not-exist.txt")), false);
    assert.match(work.events.at(-1).message, /Policy blocked step .*Work contract requires approval/);
  } finally {
    if (previousWorkDirectory === undefined) delete process.env.WORKPROOF_WORK_DIRECTORY;
    else process.env.WORKPROOF_WORK_DIRECTORY = previousWorkDirectory;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

export {};
