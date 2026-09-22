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

async function fetchStatus(url) {
  const response = await fetch(url, { headers: { accept: "application/vnd.github+json", "user-agent": "workproof-main-release-state-check" } });
  return response.status;
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
    const child = spawnSync(process.execPath, [path.resolve("scripts/verify-published-lineage.js")], { stdio: "inherit", cwd: process.cwd() });
    if (child.error) throw child.error;
    process.exit(child.status === null ? 1 : child.status);
  }
  if (compareVersions(packageVersion, stableVersion) < 0) throw new Error("Main package version is behind published release lineage: " + packageVersion + " < " + stableVersion);
  const releaseNotesPath = path.resolve("docs", "RELEASE-" + packageVersion + ".md");
  if (!fs.existsSync(releaseNotesPath)) throw new Error("Prepared release notes are missing for package version " + packageVersion);
  const repo = process.env.GITHUB_REPOSITORY || "ahmedsaturki/workproof-runtime";
  const publishedStatus = await fetchStatus("https://api.github.com/repos/" + repo + "/releases/tags/v" + encodeURIComponent(packageVersion));
  if (publishedStatus !== 404) throw new Error("Published GitHub Release v" + packageVersion + " exists while lineage still points to v" + stableVersion);
  const tagStatus = await fetchStatus("https://api.github.com/repos/" + repo + "/git/ref/tags/v" + encodeURIComponent(packageVersion));
  if (tagStatus !== 404) throw new Error("Git tag v" + packageVersion + " exists while lineage still points to v" + stableVersion);
  process.stdout.write(JSON.stringify({ status: "prepared-next-release", packageVersion, publishedStableVersion: stableVersion, composeStableImage: lineage.container.image, releaseNotes: path.relative(process.cwd(), releaseNotesPath) }, null, 2) + "\n");
}

main().catch(error => {
  process.stderr.write(String(error && error.stack ? error.stack : error) + "\n");
  process.exitCode = 1;
});