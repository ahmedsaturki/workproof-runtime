import { test } from "node:test";
import assert from "node:assert/strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { securePrivateDirectory, securePrivateFile } = require("../packages/storage/src/private-files");

test("private filesystem helper applies restrictive local permissions", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "workproof-private-files-"));
  const file = path.join(root, "secret.txt");
  try {
    securePrivateDirectory(root);
    fs.writeFileSync(file, "secret", { encoding: "utf8", flag: "wx" });
    securePrivateFile(file);

    if (process.platform === "win32") {
      const whoami = spawnSync("whoami", ["/user", "/fo", "csv", "/nh"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true
      });
      assert.equal(whoami.status, 0, String(whoami.stderr ?? ""));
      const sidMatch = String(whoami.stdout ?? "").match(/S-\d-\d+(?:-\d+)+/);
      assert.ok(sidMatch, String(whoami.stdout ?? ""));

      const acl = spawnSync("icacls", [file], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true
      });
      assert.equal(acl.status, 0, String(acl.stderr ?? ""));
      assert.doesNotMatch(String(acl.stdout ?? ""), /\(I\)/, String(acl.stdout ?? ""));
      assert.match(String(acl.stdout ?? ""), /:F\)/);
      const everyoneLookup = spawnSync("icacls", [file, "/findsid", "*S-1-1-0"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true
      });
      assert.doesNotMatch(String(everyoneLookup.stdout ?? ""), file.replace(/\\/g, "\\\\"), String(everyoneLookup.stdout ?? ""));
    } else {
      assert.equal(fs.statSync(root).mode & 0o777, 0o700);
      assert.equal(fs.statSync(file).mode & 0o777, 0o600);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
