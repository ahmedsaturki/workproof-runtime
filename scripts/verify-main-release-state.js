const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function parseVersion(value) {
  const match = String(value).match(/^([0-9]+)\.([0-9]+)\.([0-9]+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!match) throw new Error("Unsupported semantic version: " + value);
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]), prerelease: match[4] || "" };
}

function compareVersions(aValue, bValue) {
  const a = parseVersion(aValue);
  const b = parseVersion(bValue);
  for (const key of ["major", "minor", "patch"]) {
    if (a[key] !== b[key]) return a[key] > b[key] ? 1 : -1;
  }
  if (!a.prerelease && !b.prerelease) return 0;
  if (!a.prerelease) return 1;
  if (!b.prerelease) return -1;
  return a.prerelease.localeCompare(b.prerelease, undefined, { numeric: true });
}

const GITHUB_REPOSITORY = "ahmedsaturki/workproof-runtime";
const GITHUB_API = "https://api.github.com/repos/" + GITHUB_REPOSITORY;

async function fetchJson(pathname) {
  if (!pathname.startsWith("/")) throw new Error("GitHub API path must start with '/'");
  const headers = {
    accept: "application/vnd.github+json",
    "user-agent": "workproof-main-release-state-check"
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.authorization = "Bearer " + token;
  const response = await fetch(GITHUB_API + pathname, { headers });
  const raw = await response.text();
  let value;
  try { value = raw ? JSON.parse(raw) : null; } catch { throw new Error("GitHub API returned invalid JSON"); }
  return { status: response.status, value };
}

async function assertUnpublishedRelease(version) {
  const expectedTag = "v" + version;
  const releases = await fetchJson("/releases?per_page=100");
  if (releases.status < 200 || releases.status >= 300) throw new Error("GitHub releases API failed with HTTP " + releases.status);
  if ((releases.value ?? []).some((item) => item && item.tag_name === expectedTag)) {
    throw new Error("Published GitHub Release " + expectedTag + " exists while lineage still points to the prior stable release");
  }
  const tags = await fetchJson("/git/matching-refs/tags/");
  if (tags.status < 200 || tags.status >= 300) throw new Error("GitHub tags API failed with HTTP " + tags.status);
  if ((tags.value ?? []).some((item) => item && item.ref === "refs/tags/" + expectedTag)) {
    throw new Error("Git tag " + expectedTag + " exists while lineage still points to the prior stable release");
  }
}

async function main() {
  const packageJson = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf8"));
  const lineage = JSON.parse(fs.readFileSync(path.resolve("docs/release-lineage.json"), "utf8"));
  const compose = fs.readFileSync(path.resolve("compose.production.yaml"), "utf8");
  const packageVersion = packageJson.version;
  const stableVersion = lineage.release.version;
  const expectedImage = lineage.container.image + "@" + lineage.container.digest;
  if (!compose.includes(expectedImage)) throw new Error("Production Compose does not contain the last verified stable image/digest");
  if (packageVersion === stableVersion) {
    const shallow = spawnSync("git", ["rev-parse", "--is-shallow-repository"], { encoding: "utf8", cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] });
    if (shallow.error) throw shallow.error;
    if (String(shallow.stdout || "").trim() === "true") {
      const unshallow = spawnSync("git", ["fetch", "--no-tags", "--prune", "--unshallow", "origin"], { encoding: "utf8", cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] });
      if (unshallow.error) throw unshallow.error;
      if (unshallow.status !== 0) throw new Error("Unable to unshallow repository for release lineage comparison: " + String(unshallow.stderr || "").trim());
    }
    const releaseObject = spawnSync("git", ["cat-file", "-e", lineage.release.commit + "^{commit}"], { encoding: "utf8", cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] });
    if (releaseObject.error) throw releaseObject.error;
    if (releaseObject.status !== 0) throw new Error("Published release commit is not available after repository history synchronization: " + lineage.release.commit);
    const diff = spawnSync("git", ["diff", "--name-only", lineage.release.commit + "..HEAD"], { encoding: "utf8", cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] });
    if (diff.error) throw diff.error;
    if (diff.status !== 0) throw new Error("Unable to inspect main-vs-release source drift: " + String(diff.stderr || "").trim());
    const changedFiles = String(diff.stdout || "").split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
    const allowedPostReleaseFiles = new Set([
      "README.md",
      "SPEC.md",
      "CONTRIBUTING.md",
      "STATUS.md",
      "SOURCE-MANIFEST.md",
      "compose.production.yaml",
      "docs/release-lineage.json",
      "docs/PRODUCT-READINESS-V1.md",
      "docs/PRODUCTION-DEPLOYMENT.md",
      "docs/CONTAINER-RUNTIME.md",
      ".github/workflows/release.yml",
      "scripts/verify-main-release-state.js",
      "test/release-metadata.test.ts"
    ]);
    const unexpectedDrift = changedFiles.filter((file) => !allowedPostReleaseFiles.has(file) && !file.startsWith("docs/"));
    const readme = fs.readFileSync(path.resolve("README.md"), "utf8");
    const status = fs.readFileSync(path.resolve("STATUS.md"), "utf8");
    const sourceManifest = fs.readFileSync(path.resolve("SOURCE-MANIFEST.md"), "utf8");
    const productReadiness = fs.readFileSync(path.resolve("docs/PRODUCT-READINESS-V1.md"), "utf8");
  const productionDeployment = fs.readFileSync(path.resolve("docs/PRODUCTION-DEPLOYMENT.md"), "utf8");
  const containerRuntime = fs.readFileSync(path.resolve("docs/CONTAINER-RUNTIME.md"), "utf8");
    const expectedVersion = "v" + packageVersion;
    if (!readme.includes("**" + expectedVersion + " is the current stable release.**")) {
      throw new Error("README current stable release does not match package version " + expectedVersion);
    }
    if (!status.includes("current stable release line is **" + expectedVersion + "**")) {
      throw new Error("STATUS current stable release line does not match package version " + expectedVersion);
    }
    if (!sourceManifest.includes("current verified release lineage: " + expectedVersion)) {
      throw new Error("SOURCE-MANIFEST current verified release lineage does not match package version " + expectedVersion);
    }
    if (!sourceManifest.includes("current stable release commit: `" + lineage.release.commit + "`")) {
      throw new Error("SOURCE-MANIFEST stable release commit does not match release lineage");
    }
    if (!productReadiness.includes("The current stable product baseline is **" + expectedVersion + "**.")) {
      throw new Error("PRODUCT-READINESS current stable baseline does not match package version " + expectedVersion);
    }
    if (!productReadiness.includes("commit-addressed image tag: `" + lineage.container.immutableTag + "`")) {
      throw new Error("PRODUCT-READINESS commit-addressed image tag does not match release lineage");
    }
    if (!productionDeployment.includes("- image: `" + lineage.container.image + "`")) {
      throw new Error("PRODUCTION-DEPLOYMENT image does not match release lineage");
    }
    if (!productionDeployment.includes("- pinned digest: `" + lineage.container.digest + "`")) {
      throw new Error("PRODUCTION-DEPLOYMENT digest does not match release lineage");
    }
    if (!productionDeployment.includes("- commit-addressed image tag: `" + lineage.container.immutableTag + "`")) {
      throw new Error("PRODUCTION-DEPLOYMENT commit-addressed image tag does not match release lineage");
    }
    if (!productionDeployment.includes("- release commit: `" + lineage.release.commit + "`")) {
      throw new Error("PRODUCTION-DEPLOYMENT release commit does not match release lineage");
    }
    if (!containerRuntime.includes("- GHCR image: `" + lineage.container.image + "`")) {
      throw new Error("CONTAINER-RUNTIME image does not match release lineage");
    }
    if (!containerRuntime.includes("- published digest: `" + lineage.container.digest + "`")) {
      throw new Error("CONTAINER-RUNTIME digest does not match release lineage");
    }
    if (!containerRuntime.includes("- commit-addressed image tag: `" + lineage.container.immutableTag + "`")) {
      throw new Error("CONTAINER-RUNTIME commit-addressed image tag does not match release lineage");
    }
    if (unexpectedDrift.length) {
      throw new Error(
        "Main contains source/distribution drift after the published release without a version bump: " +
        unexpectedDrift.join(", ") +
        ". Bump package.json to the next release version before changing product/source files."
      );
    }
    const child = spawnSync(process.execPath, [path.resolve("scripts/verify-published-lineage.js")], { stdio: "inherit", cwd: process.cwd() });
    if (child.error) throw child.error;
    process.exit(child.status === null ? 1 : child.status);
  }
  if (compareVersions(packageVersion, stableVersion) < 0) throw new Error("Main package version is behind published release lineage: " + packageVersion + " < " + stableVersion);
  const releaseNotesPath = path.resolve("docs", "RELEASE-" + packageVersion + ".md");
  if (!fs.existsSync(releaseNotesPath)) throw new Error("Prepared release notes are missing for package version " + packageVersion);
  await assertUnpublishedRelease(packageVersion);
  process.stdout.write(JSON.stringify({ status: "prepared-next-release", packageVersion, publishedStableVersion: stableVersion, composeStableImage: lineage.container.image, releaseNotes: path.relative(process.cwd(), releaseNotesPath) }, null, 2) + "\n");
}

main().catch(error => {
  process.stderr.write(String(error && error.stack ? error.stack : error) + "\n");
  process.exitCode = 1;
});