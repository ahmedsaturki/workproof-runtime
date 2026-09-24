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
  assert.match(releaseStateScript, /packages\/control-plane\/src\/http\.ts/);
  assert.match(releaseStateScript, /test\/control-idempotency\.test\.ts/);
  assert.match(releaseStateScript, /test\/control-plane-app\.test\.ts/);
  assert.match(releaseStateScript, /scripts\/packed-control-plane-smoke\.js/);
  assert.match(releaseStateScript, /scripts\/packed-mcp-smoke\.js/);
  assert.match(releaseStateScript, /scripts\/packed-a2a-smoke\.js/);
  assert.match(releaseStateScript, /scripts\/verify-source-tree\.js/);
  assert.match(releaseStateScript, /scripts\/secret-scan\.js/);
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

test("versioned release note matches the active package version and required release semantics", () => {
  const version = packageJson.version;
  const note = fs.readFileSync(path.join(root, "docs", "RELEASE-" + version + ".md"), "utf8");
  assert.match(note, new RegExp("WorkProof Runtime v" + version.replace(/\./g, "\\.")));
  assert.doesNotMatch(note, /release candidate/i);

  if (version === "3.8.13") {
    assert.match(note, /published patch release after v3\.8\.12/);
    assert.match(note, /paths-ignore/);
    assert.match(note, /GitHub Release: `v3\.8\.13`/);
    assert.match(note, /GHCR digest: `sha256:c9a9f6f6f0fb111dc64d42b1a2746091f14366c389c1af6eb3b0683c6e3fe564`/);
    assert.doesNotMatch(note, /inline CodeQL suppression|Publication must not be claimed/);
  }

  if (version === "3.8.14") {
    assert.match(note, /terminal mutation errors/i);
    assert.match(note, /WORKPROOF_TEST_TIMEOUT_MS/);
    assert.match(note, /v3\.8\.13/);
  }
});

test("external topology smoke uses compatible tool-specific version probes", () => {
  assert.match(externalTopologySmoke, /openssl:\s*\["version"\]/);
  assert.match(externalTopologySmoke, /docker:\s*\["--version"\]/);
  assert.match(externalTopologySmoke, /curl:\s*\["--version"\]/);
  assert.match(externalTopologySmoke, /tar:\s*\["--version"\]/);
});

test("external topology smoke is portable across Windows and POSIX hosts", () => {
  assert.match(externalTopologySmoke, /process\.platform === "win32" \? "NUL" : "\/dev\/null"/);
  assert.doesNotMatch(externalTopologySmoke, /-o", "\/dev\/null"/);
  assert.match(externalTopologySmoke, /function sleepSeconds\(/);
  assert.doesNotMatch(externalTopologySmoke, /run\("sleep"/);
  assert.match(externalTopologySmoke, /WINDOWS_TOOL_CANDIDATES/);
  assert.match(externalTopologySmoke, /function tool\(command\)/);
  assert.match(externalTopologySmoke, /run\(tool\("openssl"\)/);
  assert.match(externalTopologySmoke, /run\(tool\("curl"\)/);
});

test("solo governance verifier authenticates GitHub API calls when a token is available", () => {
  assert.match(soloGovernanceScript, /process\.env\.GITHUB_TOKEN/);
  assert.match(soloGovernanceScript, /headers\.authorization = "Bearer " \+ token/);
  assert.match(soloGovernanceScript, /copilot_code_review/);
  assert.match(soloGovernanceScript, /required_signatures/);
  assert.match(soloGovernanceScript, /WORKPROOF_TAG_RULESET_ID/);
  assert.match(soloGovernanceScript, /TAG_RULESET_NAME = "v\*"/);
  assert.match(soloGovernanceScript, /refs\/tags\/v\*/);
  assert.match(soloGovernanceScript, /requiredRule\(tagRuleset, "deletion"\)/);
  assert.match(soloGovernanceScript, /requiredRule\(tagRuleset, "non_fast_forward"\)/);
  assert.match(soloGovernanceScript, /requiredRule\(tagRuleset, "update"\)/);
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
  assert.doesNotMatch(lineageScript, /execFileSync\("curl"/);
  assert.doesNotMatch(lineageScript, /\/dev\/null/);
  assert.match(lineageScript, /ghcr\.io\/token\?scope=repository:/);
  assert.match(lineageScript, /Authorization: "Bearer " \+ token/);
  assert.match(lineageScript, /docker-content-digest/);
  assert.match(lineageScript, /application\/vnd\.oci\.image\.index\.v1\+json/);
  assert.match(lineageScript, /const digest = await ghcrDigest\(release\.version\)/);
  assert.doesNotMatch(lineageScript, /ghcrDigest\(published\.tag_name\)/);
});

test("runtime private-state artifacts are excluded from git and the container build context", () => {
  const gitignore = fs.readFileSync(path.join(root, ".gitignore"), "utf8");
  const dockerignore = fs.readFileSync(path.join(root, ".dockerignore"), "utf8");
  for (const entry of ["private.pem", "public.pem", "trust.json", "restored-proof.json", "vault/", "imported/", "portable-bundle/"]) {
    assert.ok(gitignore.includes(entry), ".gitignore must exclude " + entry);
  }
  for (const entry of ["private.pem", "public.pem", "trust.json", "restored-proof.json", "vault", "imported", "portable-bundle"]) {
    assert.ok(dockerignore.includes(entry), ".dockerignore must exclude " + entry);
  }
});

test("release-state allowlist covers ignore-file hardening without a version bump", () => {
  assert.match(releaseStateScript, /"\.gitignore"/);
  assert.match(releaseStateScript, /"\.dockerignore"/);
  assert.match(releaseStateScript, /"scripts\/external-topology-smoke\.js"/);
  assert.match(releaseStateScript, /"scripts\/verify-source-tree\.js"/);
  assert.match(releaseStateScript, /"scripts\/secret-scan\.js"/);
  assert.match(releaseStateScript, /"packages\/cli\/src\/index\.ts"/);
  assert.match(releaseStateScript, /"apps\/studio\.ts"/);
  assert.match(releaseStateScript, /"test\/product-smoke\.test\.ts"/);
  assert.match(releaseStateScript, /"test\/persistent-leases\.test\.ts"/);
});

test("product readiness historical provenance names the immediately preceding stable release", () => {
  const productReadiness = fs.readFileSync(path.join(root, "docs", "PRODUCT-READINESS-V1.md"), "utf8");
  assert.match(productReadiness, /v3\.8\.12 was the preceding verified stable distribution/);
  assert.doesNotMatch(productReadiness, /v3\.8\.11 was the preceding verified stable distribution/);
});

test("README distinguishes the immediate previous stable from the verified rollback release", () => {
  const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
  assert.match(readme, /immediate previous stable: v3\.8\.12/);
  assert.match(readme, /verified rollback release: v3\.8\.1/);
  assert.match(readme, /v3\.8\.1 remains the verified rollback release/);
  const lineage = JSON.parse(fs.readFileSync(path.join(root, "docs", "release-lineage.json"), "utf8"));
  assert.strictEqual(lineage.rollback.version, "3.8.1");
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

test("solo governance verifier enforces immutable current stable release provenance", () => {
  assert.ok(soloGovernanceScript.includes("/releases/tags/"));
  assert.ok(soloGovernanceScript.includes("lineage.release.version"));
  assert.ok(soloGovernanceScript.includes("release.immutable === true"));
  assert.ok(soloGovernanceScript.includes("release.target_commitish === lineage.release.commit"));
});

test("immutable release publication is draft-first and assets are validated before publish", () => {
  const createIndex = releaseWorkflow.indexOf('gh release create "${RELEASE_TAG}"');
  const uploadIndex = releaseWorkflow.indexOf('gh release upload "${RELEASE_TAG}" --repo "${GITHUB_REPOSITORY}" --clobber release-dist/*');
  const validateIndex = releaseWorkflow.indexOf('ASSET_NAMES="$(gh release view "${RELEASE_TAG}" --repo "${GITHUB_REPOSITORY}" --json assets --jq ".assets[].name")"');
  const publishIndex = releaseWorkflow.indexOf('gh release edit "${RELEASE_TAG}" --repo "${GITHUB_REPOSITORY}" --draft=false --notes-file "${NOTES_FILE}"');
  assert.ok(createIndex >= 0, "release workflow must create the release explicitly");
  assert.ok(uploadIndex > createIndex, "release assets must be uploaded after draft creation");
  assert.ok(validateIndex > uploadIndex, "release assets must be validated while the release is still mutable");
  assert.ok(publishIndex > validateIndex, "release must be published only after asset validation");
  assert.ok(releaseWorkflow.includes("--draft"));
  assert.ok(releaseWorkflow.includes("isImmutable"));
  assert.ok(releaseWorkflow.includes('"RELEASE-MANIFEST.txt"'));
  assert.ok(releaseWorkflow.includes('"SHA256SUMS.txt"'));
  assert.ok(releaseWorkflow.includes('"operational-reality-core-${RELEASE_TAG#v}.tgz"'));
  assert.ok(releaseWorkflow.includes('"workproof-benchmark-${RELEASE_TAG}.json"'));
  assert.ok(releaseWorkflow.includes('"workproof-runtime-${RELEASE_TAG}.tar.gz"'));
  assert.ok(releaseWorkflow.includes('test "${PUBLISHED_RELEASE_IMMUTABLE}" = "true"'));
});

test("release reconciles an existing release body from the versioned release notes", () => {
  assert.match(releaseWorkflow, /gh release edit "\${RELEASE_TAG}" --repo "\${GITHUB_REPOSITORY}" --notes-file "\${NOTES_FILE}"/);
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

