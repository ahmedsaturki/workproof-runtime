const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const path = require("path");

const root = require("process").cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const lockJson = JSON.parse(fs.readFileSync(path.join(root, "package-lock.json"), "utf8"));
const licenseText = fs.readFileSync(path.join(root, "LICENSE"), "utf8");
const releaseStateScript = fs.readFileSync(path.join(root, "scripts", "verify-main-release-state.js"), "utf8");

test("release metadata is explicit and reproducible", () => {
  assert.strictEqual(packageJson.license, "Apache-2.0");
  assert.strictEqual(packageJson.private, true);
  assert.strictEqual(packageJson.version, lockJson.version);
  assert.strictEqual(lockJson.lockfileVersion, 3);
  assert.strictEqual(lockJson.packages?.[""]?.version, packageJson.version);
  assert.strictEqual(lockJson.packages?.[""]?.name, packageJson.name);
  assert.ok(packageJson.repository?.url?.includes("github.com/ahmedsaturki/workproof-runtime"));
  assert.strictEqual(packageJson.bin?.workctl, "dist/packages/cli/src/index.js");
  assert.ok(Array.isArray(packageJson.files) && packageJson.files.includes("LICENSE"));
  assert.ok(licenseText.includes("Apache License") && licenseText.includes("Version 2.0"));
  assert.ok(licenseText.includes("WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND"));
});

test("published-lineage verifier exit code is propagated without truthiness coercion", () => {
  assert.match(releaseStateScript, /if \(child\.error\) throw child\.error;/);
  assert.match(releaseStateScript, /process\.exit\(child\.status === null \? 1 : child\.status\);/);
  assert.doesNotMatch(releaseStateScript, /process\.exit\(child\.status \|\| 1\);/);
  assert.match(releaseStateScript, /git.*rev-parse.*is-shallow-repository/s);
  assert.match(releaseStateScript, /git.*fetch.*--no-tags.*--prune.*--unshallow.*origin/s);
  assert.match(releaseStateScript, /git.*cat-file.*lineage\.release\.commit/s);
});

export {};
