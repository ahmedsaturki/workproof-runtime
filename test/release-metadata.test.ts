const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const path = require("path");

const root = require("process").cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const lockJson = JSON.parse(fs.readFileSync(path.join(root, "package-lock.json"), "utf8"));
const licenseText = fs.readFileSync(path.join(root, "LICENSE"), "utf8");
const releaseStateScript = fs.readFileSync(path.join(root, "scripts", "verify-main-release-state.js"), "utf8");
const soloGovernanceScript = fs.readFileSync(path.join(root, "scripts", "verify-solo-governance.js"), "utf8");
const externalTopologySmoke = fs.readFileSync(path.join(root, "scripts", "external-topology-smoke.js"), "utf8");
const trustTransport = fs.readFileSync(path.join(root, "packages", "registry", "src", "trust-transport.ts"), "utf8");

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
  assert.match(releaseStateScript, /\.github\/workflows\/ci\.yml/);
  assert.match(releaseStateScript, /\.github\/workflows\/container\.yml/);
  assert.match(releaseStateScript, /\.github\/workflows\/release\.yml/);
  assert.match(releaseStateScript, /scripts\/verify-main-release-state\.js/);
  assert.match(releaseStateScript, /scripts\/verify-published-lineage\.js/);
  assert.match(releaseStateScript, /scripts\/verify-solo-governance\.js/);
  assert.match(releaseStateScript, /test\/release-metadata\.test\.ts/);
});

test("validated trust snapshot network sink has a scoped CodeQL path exclusion", () => {
  const codeqlWorkflow = fs.readFileSync(path.join(root, ".github", "workflows", "codeql.yml"), "utf8");
  assert.match(codeqlWorkflow, /packages\/registry\/src\/trust-transport\.ts/);
  assert.match(trustTransport, /\/v1\/trust\/snapshots/);
  assert.doesNotMatch(trustTransport, /codeql\[js\/file-access-to-http\]/);
});

test("trust publish uses the dedicated validated transport sink rather than the generic registry request path", () => {
  const registryClient = fs.readFileSync(path.join(root, "packages", "registry", "src", "client.ts"), "utf8");
  assert.match(registryClient, /const result = await postValidatedTrustSnapshot\(registryUrl, transport, token\)/);
  assert.doesNotMatch(registryClient, /request\(registryUrl, "POST", "\/v1\/trust\/snapshots", transport, token\)/);
});

test("published v3.8.13 release note matches the implemented CodeQL boundary", () => {
  const note = fs.readFileSync(path.join(root, "docs", "RELEASE-3.8.13.md"), "utf8");
  assert.match(note, /published patch release after v3\.8\.12/);
  assert.match(note, /paths-ignore/);
  assert.match(note, /GitHub Release: `v3\.8\.13`/);
  assert.doesNotMatch(note, /release candidate/i);
  assert.match(note, /GHCR digest: `sha256:c9a9f6f6f0fb111dc64d42b1a2746091f14366c389c1af6eb3b0683c6e3fe564`/);
  assert.doesNotMatch(note, /inline CodeQL suppression|Publication must not be claimed/);
});

test("external topology smoke uses compatible tool-specific version probes", () => {
  assert.match(externalTopologySmoke, /openssl:\s*\["version"\]/);
  assert.match(externalTopologySmoke, /docker:\s*\["--version"\]/);
  assert.match(externalTopologySmoke, /curl:\s*\["--version"\]/);
  assert.match(externalTopologySmoke, /tar:\s*\["--version"\]/);
});

test("solo governance verifier authenticates GitHub API calls when a token is available", () => {
  assert.match(soloGovernanceScript, /process\.env\.GITHUB_TOKEN/);
  assert.match(soloGovernanceScript, /headers\.authorization = "Bearer " \+ token/);
  assert.match(soloGovernanceScript, /copilot_code_review/);
  assert.match(soloGovernanceScript, /required_signatures/);
});

test("main release-state guard enforces current stable documentation coherence", () => {
  assert.match(releaseStateScript, /README current stable release does not match package version/);
  assert.match(releaseStateScript, /STATUS current stable release line does not match package version/);
  assert.match(releaseStateScript, /SOURCE-MANIFEST current verified release lineage does not match package version/);
  assert.match(releaseStateScript, /PRODUCT-READINESS current stable baseline does not match package version/);
  assert.match(releaseStateScript, /PRODUCT-READINESS commit-addressed image tag does not match release lineage/);
  assert.match(releaseStateScript, /PRODUCTION-DEPLOYMENT image does not match release lineage/);
  assert.match(releaseStateScript, /PRODUCTION-DEPLOYMENT digest does not match release lineage/);
  assert.match(releaseStateScript, /PRODUCTION-DEPLOYMENT commit-addressed image tag does not match release lineage/);
  assert.match(releaseStateScript, /PRODUCTION-DEPLOYMENT release commit does not match release lineage/);
  assert.match(releaseStateScript, /CONTAINER-RUNTIME image does not match release lineage/);
  assert.match(releaseStateScript, /CONTAINER-RUNTIME digest does not match release lineage/);
  assert.match(releaseStateScript, /CONTAINER-RUNTIME commit-addressed image tag does not match release lineage/);
});

test("published-lineage GHCR probe uses the same authenticated manifest contract as container verification", () => {
  const lineageScript = fs.readFileSync(path.join(root, "scripts", "verify-published-lineage.js"), "utf8");
  assert.match(lineageScript, /execFileSync\("curl"/);
  assert.match(lineageScript, /ghcr\.io\/token\?scope=repository:/);
  assert.match(lineageScript, /["\x27]Authorization: Bearer ["\x27] \+ token/);
  assert.match(lineageScript, /Docker-Content-Digest/);
  assert.match(lineageScript, /digestLine\.slice\(digestLine\.indexOf\(":"\) \+ 1\)/);
  assert.match(lineageScript, /Accept: application\/vnd\.oci\.image\.index\.v1\+json/);
  assert.match(lineageScript, /const digest = await ghcrDigest\(release\.version\)/);
  assert.doesNotMatch(lineageScript, /ghcrDigest\(published\.tag_name\)/);

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
const composeSmoke = fs.readFileSync(path.join(root, "scripts", "container-compose-smoke.js"), "utf8");
const containerWorkflow = fs.readFileSync(path.join(root, ".github", "workflows", "container.yml"), "utf8");

test("external topology smoke uses the runtime UID for bind-mounted private data", () => {
  assert.match(externalTopologySmoke, /"--user", "0:0"/);
  assert.match(externalTopologySmoke, /chown -R 10001:10001 \/data/);
  assert.match(externalTopologySmoke, /chmod 700 \/data/);
  assert.ok(externalTopologySmoke.includes("preparePrivateDataDirectory(currentImage, dataDir)"));
  assert.ok(externalTopologySmoke.includes("restorePrivateDataDirectory(productionImage, dataDir, backupPath)"));
});

test("external topology backup operates through the private container boundary", () => {
  assert.ok(externalTopologySmoke.includes("function backupPrivateDataDirectory(image, dataDirectory, backupFile)"));
  assert.ok(externalTopologySmoke.includes("function restorePrivateDataDirectory(image, dataDirectory, backupFile)"));
  assert.ok(externalTopologySmoke.includes('dataDirectory + ":/data:ro"'));
  assert.ok(externalTopologySmoke.includes("tar -C /data -czf /backup/"));
  assert.ok(!externalTopologySmoke.includes('tar", ["-C", dataDir, "-czf", backupPath'));
  assert.ok(!externalTopologySmoke.includes("fs.rmSync(dataDir, { recursive: true, force: true })"));
});

test("Container workflow does not expose the GHCR token through an environment variable", () => {
  assert.doesNotMatch(containerWorkflow, /GH_TOKEN:\s*\$\{\{\s*github\.token\s*\}\}/);
  assert.match(containerWorkflow, /echo "\$\{\{\s*github\.token\s*\}\}" \| docker login ghcr\.io .*--password-stdin/);
});

test("Container workflow prepares runtime smoke volume for UID 10001", () => {
  assert.ok(containerWorkflow.includes("--user 0:0"));
  assert.ok(containerWorkflow.includes('chown -R 10001:10001 /data'));
  assert.ok(containerWorkflow.includes("chmod 700 /data"));
  assert.ok(containerWorkflow.includes("stat -c '%u'"));
  assert.ok(containerWorkflow.includes("stat -c '%a'"));
});

test("Compose smoke prepares bind-mounted private data for UID 10001", () => {
  assert.match(composeSmoke, /"--user", "0:0"/);
  assert.match(composeSmoke, /chown -R 10001:10001 \/data/);
  assert.match(composeSmoke, /chmod 700 \/data/);
});

test("Compose smoke cleans private bind mounts through the container root boundary", () => {
  assert.match(composeSmoke, /function cleanupPrivateDataDirectory\(image, rootDirectory\)/);
  assert.ok(composeSmoke.includes('"-v", rootDirectory + ":/cleanup:rw"'));
  assert.ok(composeSmoke.includes('"find /cleanup -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +"'));
  assert.ok(composeSmoke.includes("cleanupPrivateDataDirectory(image, root)"));
  assert.match(composeSmoke, /try \{ fs\.rmSync\(root, \{ recursive: true, force: true \}\); \} catch \{\}/);
});

test("external topology smoke runs on pull requests", () => {
  assert.match(ciWorkflow, /github.event_name == 'pull_request'/);
});

test("CI external topology smoke only selects GHCR images for semantic release branches", () => {
  assert.ok(ciWorkflow.includes('RELEASE_REF="${REF_NAME#release/}"'));
  assert.ok(ciWorkflow.includes('[[ "${REF_NAME}" =~ ^release/[0-9]+\\.[0-9]+\\.[0-9]+([.-][0-9A-Za-z.-]+)?$ ]]'));
  assert.ok(ciWorkflow.includes('Using local image for non-versioned release-like branch'));
  assert.ok(ciWorkflow.includes('export WORKPROOF_RELEASE_IMAGE="ghcr.io/${GITHUB_REPOSITORY}:${RELEASE_REF}"'));
});

test("release waits for the container verification gate before package verification", () => {
  const waitIndex = releaseWorkflow.indexOf("name: Wait for container verification gate");
  const fullCheckIndex = releaseWorkflow.indexOf("name: Full release verification");
  assert.ok(waitIndex >= 0, "container verification gate must exist");
  assert.ok(fullCheckIndex >= 0, "full release verification must exist");
  assert.ok(waitIndex < fullCheckIndex, "container verification must complete before release npm check");
});

export {};

test("external topology smoke never passes a release image from the environment directly to Docker", () => {
  assert.match(externalTopologySmoke, /expectedReleaseImage = "ghcr\.io\/ahmedsaturki\/workproof-runtime:"/);
  assert.ok(externalTopologySmoke.includes("releaseImageOverride !== expectedReleaseImage"));
  assert.ok(externalTopologySmoke.includes("const currentImage = releaseImageOverride ? expectedReleaseImage : localImage;"));
  assert.doesNotMatch(externalTopologySmoke, /run\(\s*["']docker["'][^\n]*releaseImageOverride/);
  assert.doesNotMatch(externalTopologySmoke, /sh.*-lc.*command -v/);
});

