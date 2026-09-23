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

test("main release-state guard keeps release-control allowlist explicit", () => {
  assert.match(releaseStateScript, /SPEC\.md/);
  assert.match(releaseStateScript, /\.github\/workflows\/release\.yml/);
  assert.match(releaseStateScript, /scripts\/verify-main-release-state\.js/);
  assert.match(releaseStateScript, /test\/release-metadata\.test\.ts/);
});

test("main release-state guard enforces current stable documentation coherence", () => {
  assert.match(releaseStateScript, /README current stable release does not match package version/);
  assert.match(releaseStateScript, /STATUS current stable release line does not match package version/);
  assert.match(releaseStateScript, /SOURCE-MANIFEST current verified release lineage does not match package version/);
  assert.match(releaseStateScript, /PRODUCT-READINESS current stable baseline does not match package version/);
  assert.match(releaseStateScript, /PRODUCT-READINESS immutable image tag does not match release lineage/);
  assert.match(releaseStateScript, /PRODUCTION-DEPLOYMENT image does not match release lineage/);
  assert.match(releaseStateScript, /PRODUCTION-DEPLOYMENT digest does not match release lineage/);
  assert.match(releaseStateScript, /PRODUCTION-DEPLOYMENT immutable image tag does not match release lineage/);
  assert.match(releaseStateScript, /PRODUCTION-DEPLOYMENT release commit does not match release lineage/);
  assert.match(releaseStateScript, /CONTAINER-RUNTIME image does not match release lineage/);
  assert.match(releaseStateScript, /CONTAINER-RUNTIME digest does not match release lineage/);
  assert.match(releaseStateScript, /CONTAINER-RUNTIME immutable image tag does not match release lineage/);
});

test("published-lineage verifier exit code is propagated without truthiness coercion", () => {
  assert.match(releaseStateScript, /if \(child\.error\) throw child\.error;/);
  assert.match(releaseStateScript, /process\.exit\(child\.status === null \? 1 : child\.status\);/);
  assert.doesNotMatch(releaseStateScript, /process\.exit\(child\.status \|\| 1\);/);
  assert.match(releaseStateScript, /git.*rev-parse.*is-shallow-repository/s);
  assert.match(releaseStateScript, /git.*fetch.*--no-tags.*--prune.*--unshallow.*origin/s);
  assert.match(releaseStateScript, /git.*cat-file.*lineage\.release\.commit/s);
});


const ciWorkflow = fs.readFileSync(path.join(root, ".github", "workflows", "ci.yml"), "utf8");
const releaseWorkflow = fs.readFileSync(path.join(root, ".github", "workflows", "release.yml"), "utf8");
const externalTopologySmoke = fs.readFileSync(path.join(root, "scripts", "external-topology-smoke.js"), "utf8");
const composeSmoke = fs.readFileSync(path.join(root, "scripts", "container-compose-smoke.js"), "utf8");

test("external topology smoke uses the runtime UID for bind-mounted private data", () => {
  assert.match(externalTopologySmoke, /"--user", "0:0"/);
  assert.match(externalTopologySmoke, /chown -R 10001:10001 \/data/);
  assert.match(externalTopologySmoke, /chmod 700 \/data/);
  assert.match(externalTopologySmoke, /preparePrivateDataDirectory(productionImage, dataDir)/);
});

test("external topology backup operates through the private container boundary", () => {
  assert.ok(externalTopologySmoke.includes("function backupPrivateDataDirectory(image, dataDirectory, backupFile)"));
  assert.ok(externalTopologySmoke.includes("function restorePrivateDataDirectory(image, dataDirectory, backupFile)"));
  assert.ok(externalTopologySmoke.includes('dataDirectory + ":/data:ro"'));
  assert.ok(externalTopologySmoke.includes("tar -C /data -czf /backup/"));
  assert.ok(!externalTopologySmoke.includes('tar", ["-C", dataDir, "-czf", backupPath'));
});

test("Compose smoke prepares bind-mounted private data for UID 10001", () => {
  assert.match(composeSmoke, /"--user", "0:0"/);
  assert.match(composeSmoke, /chown -R 10001:10001 \/data/);
  assert.match(composeSmoke, /chmod 700 \/data/);
});

test("external topology smoke runs on pull requests", () => {
  assert.match(ciWorkflow, /github.event_name == 'pull_request'/);
});

test("release waits for the container verification gate before package verification", () => {
  const waitIndex = releaseWorkflow.indexOf("name: Wait for container verification gate");
  const fullCheckIndex = releaseWorkflow.indexOf("name: Full release verification");
  assert.ok(waitIndex >= 0, "container verification gate must exist");
  assert.ok(fullCheckIndex >= 0, "full release verification must exist");
  assert.ok(waitIndex < fullCheckIndex, "container verification must complete before release npm check");
});

export {};
