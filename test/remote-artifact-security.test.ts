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
  const trustSync = read("packages/evidence/src/trust-sync.ts");
  const cli = read("packages/cli/src/index.ts");

  assert.match(discovery, /const payload = await response\.json\(\) as \{ results\?: unknown\[\]\ \}/);
  assert.match(discovery, /const unique = uniqueDiscoveryRecords\(Array\.isArray\(payload\.results\) \? payload\.results : \[\]\)/);
  assert.match(discovery, /if \(unique\.length < input\.minRecords\)/);
  assert.match(discovery, /atomicWriteJson\(input\.outputPath, unique\)/);
  assert.match(discovery, /website\.length > 4096/);
  assert.match(discovery, /parsed\.protocol !== "http:" && parsed\.protocol !== "https:"/);
  assert.match(discovery, /return \{ name, website, source \}/);
  assert.match(discovery, /const temporary = filePath \+ "\.tmp-" \+ crypto\.randomBytes\(8\)/);

  assert.match(trustSync, /validateTrustPolicy\(snapshot\.policy\)/);
  assert.match(trustSync, /snapshot\.digest !== digestTrustPolicySnapshot\(snapshot\)/);
  assert.match(trustSync, /verifyProofSignature\(signingEnvelope\(snapshot\), signature\)/);
  assert.match(trustSync, /const output: TrustPolicySnapshot = \{/);
  assert.match(trustSync, /return JSON\.stringify\(output, null, 2\) \+ "\\n"/);

  assert.match(cli, /const snapshot = await getTrustSnapshotFromRegistry\(registryUrl, digest, token\)/);
  assert.match(cli, /serializeTrustPolicySnapshot\(snapshot\)/);
});

test("remote artifact sinks do not write raw response payloads directly", () => {
  const discovery = read("packages/packs/src/web-discovery-pack.ts");
  const cli = read("packages/cli/src/index.ts");

  assert.doesNotMatch(discovery, /atomicWriteJson\([^\n]*payload/);
  assert.doesNotMatch(discovery, /fs\.writeFileSync\([^\n]*response/);
  assert.doesNotMatch(cli, /fs\.writeFileSync\([^\n]*snapshot(?![\w])/);
});

export {};
