const fs = require("fs");
const { WorkStore } = require("../../core/src/work.js");
const { CapabilityRegistry } = require("../../capabilities/src/registry.js");
const { VerificationEngine } = require("../../verification/src/engine.js");
const { WorkEngine } = require("../../runtime/src/engine.js");
const { JsonWorkRepository } = require("../../storage/src/json.js");
const { registerLocalPack } = require("../../packs/src/local-pack.js");
const { registerResearchPack } = require("../../packs/src/research-pack.js");
const { registerWebDiscoveryPack } = require("../../packs/src/web-discovery-pack.js");
const { registerPublicationPack } = require("../../packs/src/publication-pack.js");
const { registerLocalBrowserPack } = require("../../packs/src/browser-local-pack.js");
const { buildProofBundle } = require("../../evidence/src/bundle.js");
const { buildIntegrityManifest, verifyProofIntegrity } = require("../../evidence/src/integrity.js");
const { generateProofKeyPair, signProof, verifyProofSignature, proofKeyId } = require("../../evidence/src/signature.js");
const { loadTrustPolicy, saveTrustPolicy, trustKey, revokeKey, evaluateProofTrust } = require("../../evidence/src/trust.js");

function usage(): void {
  process.stdout.write(`workctl
  run <mission.json>
  inspect <proof.json>
  verify <proof.json> [trust-policy.json] [--require-trusted]
  summarize <proof.json>
  keygen <private.pem> <public.pem>
  sign <proof.json> <private.pem>
  trust-add <public.pem> <trust-policy.json> [label]
  trust-revoke <key-id> <trust-policy.json> [reason]
`);
}

function proofBundleFromFile(data: any): Record<string, unknown> {
  return {
    version: data.version,
    work: data.work,
    effects: data.effects,
    artifacts: data.artifacts,
    verification: data.verification,
    events: data.events
  };
}

function writeKey(path: string, content: string, mode: number): void {
  fs.writeFileSync(path, content, { encoding: "utf8", mode });
  fs.chmodSync(path, mode);
}

function trustAdd(publicPath: string, policyPath: string, label?: string): void {
  const policy = loadTrustPolicy(policyPath);
  const publicKey = fs.readFileSync(publicPath, "utf8");
  const record = trustKey(policy, publicKey, label);
  saveTrustPolicy(policyPath, policy);
  process.stdout.write(JSON.stringify({ policy: policyPath, keyId: record.keyId, state: record.state, label: record.label ?? null }, null, 2) + "\n");
}

function trustRevoke(keyId: string, policyPath: string, reason?: string): void {
  const policy = loadTrustPolicy(policyPath);
  const record = revokeKey(policy, keyId, reason);
  saveTrustPolicy(policyPath, policy);
  process.stdout.write(JSON.stringify({ policy: policyPath, keyId: record.keyId, state: record.state, reason: record.reason ?? null }, null, 2) + "\n");
}

function generateKeys(privatePath: string, publicPath: string): void {
  if (privatePath === publicPath) throw new Error("Private and public key paths must differ");
  if (fs.existsSync(privatePath) || fs.existsSync(publicPath)) {
    throw new Error("Refusing to overwrite an existing key file");
  }
  const pair = generateProofKeyPair();
  writeKey(privatePath, pair.privateKey, 0o600);
  writeKey(publicPath, pair.publicKey, 0o644);
  process.stdout.write(JSON.stringify({
    privateKey: privatePath,
    publicKey: publicPath,
    keyId: proofKeyId(pair.publicKey)
  }, null, 2) + "\n");
}

function signProofFile(file: string, privatePath: string): void {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const privateKey = fs.readFileSync(privatePath, "utf8");
  const signature = signProof(data, privateKey);
  fs.writeFileSync(file, JSON.stringify({ ...data, signature }, null, 2), "utf8");
  process.stdout.write(JSON.stringify({
    proof: file,
    keyId: signature.keyId,
    algorithm: signature.algorithm,
    payloadDigest: signature.payloadDigest,
    status: "signed"
  }, null, 2) + "\n");
}

async function runMission(file: string): Promise<void> {
  const spec = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!spec?.objective || !Array.isArray(spec?.steps)) throw new Error("Mission spec requires objective and steps[]");
  const store = new WorkStore();
  const registry = new CapabilityRegistry();
  const verification = new VerificationEngine();
  registerLocalPack(registry);
  registerResearchPack(registry, verification);
  registerWebDiscoveryPack(registry, verification);
  registerPublicationPack(registry, verification);
  registerLocalBrowserPack(registry, verification);
  const work = store.create({
    objective: spec.objective,
    inputs: spec.inputs ?? {},
    constraints: spec.constraints ?? {},
    success: spec.success ?? [],
    deliverables: spec.deliverables ?? [],
    riskClass: spec.riskClass ?? "read",
    approvalRequired: Boolean(spec.approvalRequired)
  });
  const repo = new JsonWorkRepository(spec.workDirectory ?? "./work-runs");
  const engine = new WorkEngine(store, registry, verification, async () => false, spec.policy, repo);
  await engine.run(work, spec.steps);
  const proof = buildProofBundle(work);
  const integrity = buildIntegrityManifest(work);
  fs.writeFileSync(spec.proofPath ?? `./${work.id}.json`, JSON.stringify({ ...proof, integrity }, null, 2), "utf8");
  const proofPath = spec.proofPath ?? `./${work.id}.json`;
  process.stdout.write(JSON.stringify({ id: work.id, status: work.status, proof: proofPath, events: work.events.length, effects: work.effects.length, integrity: integrity.digest }, null, 2) + "\n");
  if (work.status !== "verified") process.exitCode = 2;
}

const [, , command, firstArg, secondArg, thirdArg] = process.argv;
if (!command) {
  usage();
  process.exitCode = 1;
} else if (command === "keygen") {
  if (!firstArg || !secondArg) { usage(); process.exitCode = 1; }
  else {
    try { generateKeys(firstArg, secondArg); }
    catch (error) { process.stderr.write(String(error) + "\n"); process.exitCode = 1; }
  }
} else if (command === "trust-add") {
  if (!firstArg || !secondArg) { usage(); process.exitCode = 1; }
  else {
    try { trustAdd(firstArg, secondArg, thirdArg); }
    catch (error) { process.stderr.write(String(error) + "\n"); process.exitCode = 1; }
  }
} else if (command === "trust-revoke") {
  if (!firstArg || !secondArg) { usage(); process.exitCode = 1; }
  else {
    try { trustRevoke(firstArg, secondArg, thirdArg); }
    catch (error) { process.stderr.write(String(error) + "\n"); process.exitCode = 1; }
  }
} else if (command === "sign") {
  if (!firstArg || !secondArg) { usage(); process.exitCode = 1; }
  else {
    try { signProofFile(firstArg, secondArg); }
    catch (error) { process.stderr.write(String(error) + "\n"); process.exitCode = 1; }
  }
} else if (command === "run") {
  if (!firstArg) { usage(); process.exitCode = 1; }
  else runMission(firstArg).catch(error => { process.stderr.write(String(error) + "\n"); process.exitCode = 1; });
} else {
  const file = firstArg;
  if (!file) { usage(); process.exitCode = 1; }
  else {
    const raw = fs.readFileSync(file, "utf8");
    const data = JSON.parse(raw);
    if (command === "inspect") {
      process.stdout.write(JSON.stringify(data, null, 2) + "\n");
    } else if (command === "summarize") {
      process.stdout.write(`${data.work.status}: ${data.work.objective}\nEffects: ${data.effects.length}\nArtifacts: ${data.artifacts.length}\nEvents: ${data.events.length}\n`);
    } else if (command === "verify") {
      const status = data.work?.status ?? data.verification?.status ?? "unverified";
      const trustPolicyPath = secondArg && !secondArg.startsWith("--") ? secondArg : undefined;
      const requireTrusted = [secondArg, thirdArg].includes("--require-trusted");
      let exitCode = 0;
      if (data.integrity) {
        const valid = verifyProofIntegrity(proofBundleFromFile(data), data.integrity);
        if (!valid) {
          process.stdout.write("integrity=invalid; ");
          exitCode = 3;
        } else {
          process.stdout.write("integrity=verified; ");
        }
      } else {
        process.stdout.write("integrity=not-present; ");
      }

      let signatureValid = false;
      if (data.signature) {
        signatureValid = verifyProofSignature(data, data.signature);
        if (!signatureValid) {
          process.stdout.write("signature=invalid; ");
          exitCode = exitCode || 4;
        } else {
          process.stdout.write("signature=verified; ");
        }
      } else {
        process.stdout.write("signature=not-present; ");
      }

      let trustState = "not-present";
      if (data.signature && trustPolicyPath) {
        const policy = loadTrustPolicy(trustPolicyPath);
        trustState = evaluateProofTrust(policy, data.signature);
      } else if (data.signature) {
        trustState = "unknown";
      }
      process.stdout.write(`trust=${trustState}; status=${status}\n`);
      if (requireTrusted && trustState !== "trusted") exitCode = exitCode || 5;
      if (exitCode === 0 && status !== "verified") exitCode = 2;
      process.exitCode = exitCode;
    } else {
      usage();
      process.exitCode = 1;
    }
  }
}

export {};
