const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

async function json(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = process.env.GITHUB_TOKEN;
  if (token && url.startsWith("https://api.github.com/")) headers.authorization = "Bearer " + token;
  const response = await fetch(url, { ...options, headers });
  const text = await response.text();
  let value;
  try { value = JSON.parse(text); } catch { throw new Error("Invalid JSON from " + url); }
  if (!response.ok) throw new Error("HTTP " + response.status + " from " + url + ": " + text.slice(0, 300));
  return { response, value };
}

const GITHUB_REPOSITORY = "ahmedsaturki/workproof-runtime";
const GHCR_REPOSITORY = GITHUB_REPOSITORY.toLowerCase();

async function ghcrDigest(tag) {
  if (!/^[A-Za-z0-9._-]+$/.test(tag)) throw new Error("Unsupported GHCR tag: " + tag);

  let tokenJson;
  try {
    tokenJson = execFileSync("curl", [
      "-fsS",
      "https://ghcr.io/token?scope=repository:" + GHCR_REPOSITORY + ":pull"
    ], { encoding: "utf8" });
  } catch (error) {
    throw new Error("Unable to obtain GHCR pull token: " + String(error && error.message ? error.message : error));
  }

  let token;
  try {
    token = JSON.parse(tokenJson).token;
  } catch {
    throw new Error("Invalid GHCR token response");
  }
  if (!token) throw new Error("GHCR pull token was not returned");

  const manifestUrl = "https://ghcr.io/v2/" + GHCR_REPOSITORY + "/manifests/" + encodeURIComponent(tag);
  const headers = execFileSync("curl", [
    "-sS",
    "-D", "-",
    "-o", "/dev/null",
    "-H", "Authorization: Bearer " + token,
    "-H", "Accept: application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json",
    manifestUrl
  ], { encoding: "utf8" });

  const statusLine = headers.split(/\r?\n/).find((line) => /^HTTP\/\d(?:\.\d)?\s+\d+/.test(line));
  const status = statusLine ? Number(statusLine.match(/\s(\d{3})(?:\s|$)/)?.[1]) : 0;
  if (status !== 200) throw new Error("GHCR manifest returned HTTP " + status);

  const digestLine = headers.split(/\r?\n/).find((line) => /^docker-content-digest:/i.test(line));
  const digest = digestLine ? digestLine.split(":", 2)[1].trim() : "";
  if (!digest) throw new Error("GHCR manifest did not expose Docker-Content-Digest");
  return digest;
}

async function main() {
  const lineage = JSON.parse(fs.readFileSync(path.resolve("docs/release-lineage.json"), "utf8"));
  const packageJson = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf8"));
  const compose = fs.readFileSync(path.resolve("compose.production.yaml"), "utf8");
  const release = lineage.release;
  const expectedImage = lineage.container.image + "@" + lineage.container.digest;
  if (packageJson.version !== release.version) throw new Error("package version does not match release lineage");
  if (!compose.includes(expectedImage)) throw new Error("production compose does not contain the canonical release image/digest");

  const releasesResult = await json("https://api.github.com/repos/ahmedsaturki/workproof-runtime/releases?per_page=100", {
    headers: { accept: "application/vnd.github+json", "user-agent": "workproof-lineage-check" }
  });
  const published = (releasesResult.value ?? []).find((item) => item && item.tag_name === release.tag);
  if (!published) throw new Error("Published GitHub Release tag was not found: " + release.tag);
  if (published.id !== release.githubReleaseId) throw new Error("GitHub Release id mismatch");
  if (published.target_commitish !== release.commit) throw new Error("GitHub Release target commit mismatch");
  const assetNames = Array.isArray(published.assets) ? published.assets.map(asset => asset.name) : [];
  const expectedAssets = [
    "operational-reality-core-" + release.version + ".tgz",
    "RELEASE-MANIFEST.txt",
    "SHA256SUMS.txt",
    "workproof-benchmark-" + release.tag + ".json",
    "workproof-runtime-" + release.tag + ".tar.gz"
  ];
  for (const name of expectedAssets) if (!assetNames.includes(name)) throw new Error("Published release is missing asset " + name);

  const digest = await ghcrDigest(published.tag_name);
  if (digest !== lineage.container.digest) throw new Error("GHCR digest mismatch: " + digest + " != " + lineage.container.digest);

  const expectedRollbackCommit = "f8af30bf69391db22863c432df5c452a73ebaa05";
  if (lineage.rollback.commit !== expectedRollbackCommit) throw new Error("Unexpected rollback release commit in lineage");
  const rollbackDigest = await ghcrDigest(expectedRollbackCommit);
  if (!/^sha256:[0-9a-f]{64}$/.test(rollbackDigest)) throw new Error("Rollback immutable image did not expose a valid digest");
  if (rollbackDigest !== lineage.rollback.digest) throw new Error("Rollback GHCR digest mismatch: " + rollbackDigest + " != " + lineage.rollback.digest);

  process.stdout.write(JSON.stringify({
    status: "verified",
    packageVersion: packageJson.version,
    releaseTag: release.tag,
    releaseId: published.id,
    releaseCommit: published.target_commitish,
    image: lineage.container.image,
    digest,
    rollbackImage: "ghcr.io/" + GHCR_REPOSITORY + ":" + expectedRollbackCommit,
    rollbackDigest,
    assets: assetNames.length
  }, null, 2) + "\n");
}

main().catch(error => { process.stderr.write(String(error && error.stack ? error.stack : error) + "\n"); process.exitCode = 1; });
