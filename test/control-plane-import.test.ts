const assert = require("assert");
const test = require("node:test");
const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

test("Control Plane application import does not start a server or create runtime state", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "workproof-control-import-"));
  const result = spawnSync(process.execPath, [
    "-e",
    'require("./dist/apps/control-plane.js"); process.stdout.write("import-ok");'
  ], {
    cwd: require("process").cwd(),
    env: {
      ...process.env,
      WORKPROOF_WORK_DIRECTORY: path.join(root, "work-runs"),
      WORKPROOF_MISSION_DIRECTORY: path.join(root, "missions"),
      WORKPROOF_PROOF_DIRECTORY: path.join(root, "proofs"),
      WORKPROOF_CONTROL_PLANE_PORT: "0",
      WORKPROOF_CONTROL_PLANE_HOST: "127.0.0.1"
    },
    encoding: "utf8"
  });
  try {
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), "import-ok");
    assert.equal(fs.existsSync(path.join(root, "work-runs")), false);
    assert.equal(fs.existsSync(path.join(root, "missions")), false);
    assert.equal(fs.existsSync(path.join(root, "proofs")), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

export {};
