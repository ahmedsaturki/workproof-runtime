const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

async function json(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
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

const GHCR_MANIFEST_ACCEPT =
  "application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json";

async function downloadBytes(url) {
  const response = await fetch(url, {
    headers: {
      accept: "*/*",
      "user-agent": "workproof-release-integrity-check"
    }
  });
  if (!response.ok) throw new Error("Asset download returned HTTP " + response.status + ": " + url);
  return Buffer.from(await response.arrayBuffer());
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function parseSha256Sums(text) {
  const entries = new Map();
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = /^([0-9a-f]{64})\s+(?:\*)?(.+)$/.exec(line);
    if (!match) throw new Error("Malformed SHA256SUMS line: " + rawLine);
    entries.set(match[2], match[1]);
  }
  return entries;
}

async function ghcrDigest(tag) {
  if (!/^[A-Za-z0-9._-]+$/.test(tag)) throw new Error("Unsupported GHCR tag: " + tag);

  const tokenResponse = await fetch(
    "https://ghcr.io/token?scope=repository:" + GHCR_REPOSITORY + ":pull"
  );
  if (!tokenResponse.ok) {
    throw new Error("Unable to obtain GHCR pull token: HTTP " + tokenResponse.status);
  }
  let token;
  try {
    token = (await tokenResponse.json()).token;
  } catch {
    throw new Error("Invalid GHCR token response");
  }
  if (!token) throw new Error("GHCR pull token was not returned");

  const manifestUrl = "https://ghcr.io/v2/" + GHCR_REPOSITORY + "/manifests/" + encodeURIComponent(tag);
  const manifestResponse = await fetch(manifestUrl, {
    method: "HEAD",
    headers: {
      Authorization: "Bearer " + token,
      Accept: GHCR_MANIFEST_ACCEPT
    }
  });
  if (manifestResponse.status !== 200) {
    throw new Error("GHCR manifest returned HTTP " + manifestResponse.status);
  }
  const digest = (manifestResponse.headers.get("docker-content-digest") || "").trim();
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
  if (published.draft !== false) throw new Error("Current stable GitHub Release must not be a draft");
  if (published.prerelease !== false) throw new Error("Current stable GitHub Release must not be a prerelease");
  if (published.immutable !== true) throw new Error("Current stable GitHub Release must be immutable");

  const currentTagResult = await json("https://api.github.com/repos/ahmedsaturki/workproof-runtime/git/ref/tags/" + encodeURIComponent(release.tag), {
    headers: { accept: "application/vnd.github+json", "user-agent": "workproof-lineage-check" }
  });
  if (currentTagResult.value?.object?.sha !== release.commit) {
    throw new Error("Current Git tag target mismatch");
  }
  const assetNames = Array.isArray(published.assets) ? published.assets.map(asset => asset.name) : [];
  const expectedAssets = [
    "operational-reality-core-" + release.version + ".tgz",
    "RELEASE-MANIFEST.txt",
    "SHA256SUMS.txt",
    "workproof-benchmark-" + release.tag + ".json",
    "workproof-runtime-" + release.tag + ".tar.gz"
  ];
  if (assetNames.length !== expectedAssets.length) throw new Error("Published release asset count mismatch: " + assetNames.length + " != " + expectedAssets.length);
  for (const name of expectedAssets) if (!assetNames.includes(name)) throw new Error("Published release is missing asset " + name);
  const assetsByName = new Map((published.assets ?? []).map(asset => [asset.name, asset]));

  const sumsAsset = assetsByName.get("SHA256SUMS.txt");
  if (!sumsAsset?.browser_download_url) throw new Error("SHA256SUMS.txt download URL is missing");
  const sumsBytes = await downloadBytes(sumsAsset.browser_download_url);
  const sums = parseSha256Sums(sumsBytes.toString("utf8"));
  const hashedAssets = expectedAssets.filter(name => name !== "SHA256SUMS.txt");
  if (sums.size !== hashedAssets.length) {
    throw new Error("SHA256SUMS entry count mismatch: " + sums.size + " != " + hashedAssets.length);
  }

  const downloadedAssetDigests = {};
  for (const name of hashedAssets) {
    if (!sums.has(name)) throw new Error("SHA256SUMS.txt is missing " + name);
    const asset = assetsByName.get(name);
    if (!asset?.browser_download_url) throw new Error("Published asset has no download URL: " + name);
    const bytes = await downloadBytes(asset.browser_download_url);
    const actual = sha256(bytes);
    const expected = sums.get(name);
    if (actual !== expected) {
      throw new Error("SHA256SUMS mismatch for " + name + ": " + actual + " != " + expected);
    }
    if (asset.digest && asset.digest.replace(/^sha256:/, "") !== actual) {
      throw new Error("GitHub asset digest mismatch for " + name + ": " + asset.digest + " != sha256:" + actual);
    }
    downloadedAssetDigests[name] = "sha256:" + actual;
  }

  const manifestAsset = assetsByName.get("RELEASE-MANIFEST.txt");
  const manifestText = Buffer.from(await downloadBytes(manifestAsset.browser_download_url)).toString("utf8");
  if (!manifestText.includes("Commit: " + release.commit)) {
    throw new Error("Published RELEASE-MANIFEST.txt does not name the release commit");
  }
  if (!manifestText.includes("Package version: " + release.version)) {
    throw new Error("Published RELEASE-MANIFEST.txt does not name the release version");
  }

  const benchmarkAsset = assetsByName.get("workproof-benchmark-" + release.tag + ".json");
  const benchmark = JSON.parse(Buffer.from(await downloadBytes(benchmarkAsset.browser_download_url)).toString("utf8"));
  const metrics = benchmark.metrics ?? {};
  if (
    benchmark.passed !== true ||
    !Array.isArray(benchmark.results) ||
    benchmark.results.length !== 5 ||
    !benchmark.results.every((entry) => entry && entry.status === "verified") ||
    metrics.verifiedCompletionRate !== 1 ||
    metrics.falseDoneCount !== 0 ||
    metrics.duplicateExternalEffectCount !== 0 ||
    metrics.ambiguousOutcomeResolvedCount !== 1 ||
    metrics.capabilitySubstitutionCount !== 1 ||
    metrics.evidenceCompleteRate !== 1 ||
    metrics.humanInterventionCount !== 0
  ) {
    throw new Error("Published benchmark asset failed semantic verification");
  }

  const digest = await ghcrDigest(release.version);
  if (digest !== lineage.container.digest) throw new Error("GHCR digest mismatch: " + digest + " != " + lineage.container.digest);
  const immutableDigest = await ghcrDigest(lineage.container.immutableTag);
  if (immutableDigest !== lineage.container.digest) {
    throw new Error("Commit-addressed GHCR digest mismatch: " + immutableDigest + " != " + lineage.container.digest);
  }

  const expectedRollbackCommit = "f8af30bf69391db22863c432df5c452a73ebaa05";
  if (lineage.rollback.commit !== expectedRollbackCommit) throw new Error("Unexpected rollback release commit in lineage");
  const rollbackReleaseResult = await json("https://api.github.com/repos/ahmedsaturki/workproof-runtime/releases?per_page=100", {
    headers: { accept: "application/vnd.github+json", "user-agent": "workproof-lineage-check" }
  });
  const rollbackRelease = (rollbackReleaseResult.value ?? []).find((item) => item && item.tag_name === lineage.rollback.tag);
  if (!rollbackRelease) throw new Error("Rollback GitHub Release tag was not found: " + lineage.rollback.tag);
  if (rollbackRelease.target_commitish !== expectedRollbackCommit) throw new Error("Rollback release target commit mismatch");
  if (rollbackRelease.draft !== false || rollbackRelease.prerelease !== false) {
    throw new Error("Rollback GitHub Release must be published and stable");
  }
  const rollbackTagResult = await json("https://api.github.com/repos/ahmedsaturki/workproof-runtime/git/ref/tags/" + encodeURIComponent(lineage.rollback.tag), {
    headers: { accept: "application/vnd.github+json", "user-agent": "workproof-lineage-check" }
  });
  if (rollbackTagResult.value?.object?.sha !== expectedRollbackCommit) throw new Error("Rollback Git tag target mismatch");

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
    assets: assetNames.length,
    downloadedAssetDigests
  }, null, 2) + "\n");
}

main().catch(error => { process.stderr.write(String(error && error.stack ? error.stack : error) + "\n"); process.exitCode = 1; });
