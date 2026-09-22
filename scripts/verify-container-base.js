const fs = require("fs");
const path = require("path");

const dockerfilePath = path.resolve("Dockerfile");
const source = fs.readFileSync(dockerfilePath, "utf8");

const fromLines = source
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => /^FROM\s+/i.test(line));

if (fromLines.length < 2) {
  console.error("Expected a multi-stage Dockerfile with at least build and runtime FROM lines.");
  process.exit(1);
}

const specs = fromLines.map((line) => line.replace(/^FROM\s+/i, "").split(/\s+/)[0]);
const invalid = specs.filter((spec) => !/@sha256:[0-9a-f]{64}$/i.test(spec));
if (invalid.length) {
  console.error("All Docker base images must be pinned by immutable digest:");
  console.error(invalid.join("\n"));
  process.exit(1);
}

const normalizedImages = specs.map((spec) => spec.split("@")[0]);
if (new Set(normalizedImages).size !== 1) {
  console.error("Build and runtime stages must use the same pinned base image family.");
  process.exit(1);
}

const normalizedDigests = specs.map((spec) => spec.split("@")[1].toLowerCase());
if (new Set(normalizedDigests).size !== 1) {
  console.error("Build and runtime stages must use the same pinned base image digest.");
  process.exit(1);
}

console.log(JSON.stringify({
  status: "verified",
  stages: specs.length,
  image: normalizedImages[0],
  digest: normalizedDigests[0]
}));
