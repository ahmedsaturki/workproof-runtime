const fs = require("fs");
const path = require("path");

async function json(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let value;
  try { value = JSON.parse(text); } catch { throw new Error("Invalid JSON from " + url); }
  if (!response.ok) throw new Error("HTTP " + response.status + " from " + url + ": " + text.slice(0, 300));
  return { response, value };
}

async function ghcrDigest(image) {
  const match = image.match(/^ghcr\.io\/([^:]+):(.+)$/);
  if (!match) throw new Error("Unsupported GHCR image reference: " + image);
  const repository = match[1];
  const tag = match[2];
  const tokenResult = await json("https://ghcr.io/token?scope=repository:" + encodeURIComponent(repository) + ":pull");
  const token = tokenResult.value.token;
  if (!token) throw new Error("GHCR pull token was not returned");
  const manifestUrl = "https://ghcr.io/v2/" + repository + "/manifests/" + encodeURIComponent(tag);
  const response = await fetch(manifestUrl, {
    headers: {
      authorization: "Bearer " + token,
      accept: "application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json"
    }
  });
  if (!response.ok) throw new Error("GHCR manifest returned HTTP " + response.status);
  const digest = response.headers.get("docker-content-digest");
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

  const repo = process.env.GITHUB_REPOSITORY || "ahmedsaturki/workproof-runtime";
  const releaseResult = await json("https://api.github.com/repos/" + repo + "/releases/tags/" + encodeURIComponent(release.tag), {
    headers: { accept: "application/vnd.github+json", "user-agent": "workproof-lineage-check" }
  });
  const published = releaseResult.value;
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

  const digest = await ghcrDigest(lineage.container.image);
  if (digest !== lineage.container.digest) throw new Error("GHCR digest mismatch: " + digest + " != " + lineage.container.digest);

  const rollbackDigest = await ghcrDigest("ghcr.io/" + repo.toLowerCase() + ":" + lineage.rollback.commit);
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
    rollbackImage: "ghcr.io/" + repo.toLowerCase() + ":" + lineage.rollback.commit,
    rollbackDigest,
    assets: assetNames.length
  }, null, 2) + "\n");
}

main().catch(error => { process.stderr.write(String(error && error.stack ? error.stack : error) + "\n"); process.exitCode = 1; });
