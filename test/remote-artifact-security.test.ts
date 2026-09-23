const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(".");

function read(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("remote-to-file artifact boundary stays explicitly validated and reconstructed", () => {
  const discovery = read("packages/packs/src/web-discovery-pack.ts");
  const discoveryWriter = read("packages/packs/src/discovery-artifact-writer.ts");
  const trustSync = read("packages/evidence/src/trust-sync.ts");
  const trustWriter = read("packages/evidence/src/trust-snapshot-writer.ts");
  const cli = read("packages/cli/src/index.ts");
  const codeql = read(".github/workflows/codeql.yml");

  assert.match(discovery, /const payload = await response\.json\(\) as \{ results\?: unknown\[\]\ \}/);
  assert.match(discovery, /const unique = uniqueDiscoveryRecords\(Array\.isArray\(payload\.results\) \? payload\.results : \[\]\)/);
  assert.match(discovery, /if \(unique\.length < input\.minRecords\)/);
  assert.match(discovery, /writeValidatedDiscoveryArtifact\(input\.outputPath, unique\)/);
  assert.doesNotMatch(discovery, /function atomicWriteJson/);
  assert.match(discovery, /website\.length > 4096/);
  assert.match(discovery, /parsed\.protocol !== "http:" && parsed\.protocol !== "https:"/);
  assert.match(discovery, /return \{ name, website, source \}/);

  assert.match(discoveryWriter, /fs\.writeFileSync\(temporary, JSON\.stringify\(records, null, 2\)/);
  assert.match(discoveryWriter, /flag: "wx"/);
  assert.match(discoveryWriter, /fs\.renameSync\(temporary, filePath\)/);

  assert.match(trustSync, /validateTrustPolicy\(snapshot\.policy\)/);
  assert.match(trustSync, /snapshot\.digest !== digestTrustPolicySnapshot\(snapshot\)/);
  assert.match(trustSync, /verifyProofSignature\(signingEnvelope\(snapshot\), signature\)/);
  assert.match(trustSync, /const output: TrustPolicySnapshot = \{/);
  assert.match(trustSync, /return JSON\.stringify\(output, null, 2\) \+ "\\n"/);

  assert.match(cli, /const snapshot = await getTrustSnapshotFromRegistry\(registryUrl, digest, token\)/);
  assert.match(cli, /writeValidatedTrustSnapshot\(outputPath, snapshot\)/);
  assert.doesNotMatch(cli, /fs\.writeFileSync\([^\n]*serializeTrustPolicySnapshot/);
  assert.match(trustWriter, /serializeTrustPolicySnapshot\(snapshot\)/);
  assert.match(trustWriter, /fs\.writeFileSync\(outputPath, serialized, "utf8"\)/);

  assert.match(codeql, /packages\/evidence\/src\/trust-snapshot-writer\.ts/);
  assert.match(codeql, /packages\/packs\/src\/discovery-artifact-writer\.ts/);
  assert.doesNotMatch(codeql, /query-filters:/);
});

test("remote artifact writers do not accept raw response-shaped values by construction", () => {
  const discoveryWriter = read("packages/packs/src/discovery-artifact-writer.ts");
  const cli = read("packages/cli/src/index.ts");
  const discovery = read("packages/packs/src/web-discovery-pack.ts");

  assert.doesNotMatch(cli, /fs\.writeFileSync\([^\n]*,\s*snapshot(?:[^\w]|$)/);
  assert.doesNotMatch(discovery, /fs\.writeFileSync\([^\n]*payload/);
  assert.doesNotMatch(discovery, /atomicWriteJson\([^\n]*payload/);
  assert.doesNotMatch(discoveryWriter, /fs\.writeFileSync\([^\n]*payload/);
  assert.doesNotMatch(discoveryWriter, /fs\.writeFileSync\([^\n]*response/);
});

export {};
