#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
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
const { registerSQLitePack } = require("../../packs/src/sqlite-pack.js");
const { registerDataTransformPack } = require("../../packs/src/data-transform-pack.js");
const { registerMessageOutboxPack } = require("../../packs/src/message-outbox-pack.js");
const { registerGitLocalPack } = require("../../packs/src/git-local-pack.js");
const { buildProofBundle } = require("../../evidence/src/bundle.js");
const { buildIntegrityManifest, verifyProofIntegrity } = require("../../evidence/src/integrity.js");
const { generateProofKeyPair, signProof, verifyProofSignature, proofKeyId } = require("../../evidence/src/signature.js");
const { loadTrustPolicy, saveTrustPolicy, trustKey, revokeKey, evaluateProofTrust } = require("../../evidence/src/trust.js");
const { publishProof, restoreProof, listProofs, inspectProof } = require("../../evidence/src/vault.js");
const { setRetentionClass, pinRetention, unpinRetention, inventoryVault, planGarbageCollection, executeGarbageCollection, repairVaultIndex } = require("../../evidence/src/retention.js");
const { createAuthPolicy, loadAuthPolicy, saveAuthPolicy, issueCredential, addIssuedCredential, revokeCredential } = require("../../registry/src/auth.js");
const { publishTrustSnapshotToRegistry, getTrustSnapshotFromRegistry, listTrustSnapshotsFromRegistry, getCurrentTrustSnapshotFromRegistry, applyTrustSnapshotToRegistry } = require("../../registry/src/client.js");

function usage(): void {
  process.stdout.write(`workctl
  run <mission.json>
  resume <work-id> <mission.json>
  inspect <proof.json>
  verify <proof.json> [trust-policy.json] [--require-trusted]
  summarize <proof.json>
  keygen <private.pem> <public.pem>
  sign <proof.json> <private.pem>
  trust-add <public.pem> <trust-policy.json> [label]
  trust-revoke <key-id> <trust-policy.json> [reason]
  vault-publish <proof.json> <vault-dir>
  vault-restore <digest> <vault-dir> <output.json>
  vault-list <vault-dir>
  vault-inspect <digest> <vault-dir>
  vault-inventory <vault-dir>
  vault-retain <digest> <vault-dir> <ephemeral|standard|long|permanent> [namespace]
  vault-pin <digest> <vault-dir> [reason] [namespace] [expiresAt]
  vault-unpin <digest> <vault-dir>
  vault-gc <vault-dir> [--execute] [--namespace <name>]
  vault-repair <vault-dir>
  registry-auth-init <policy.json>
  registry-auth-add <policy.json> <credential-id> <read|write|trust|readwrite> [namespace] [label]
  registry-auth-revoke <credential-id> <policy.json> [reason]
  registry-auth-list <policy.json>
  registry-trust-publish <snapshot.json> <registry-url> <token>
  registry-trust-pull <digest> <registry-url> <output.json> <token>
  registry-trust-list <registry-url> [token]
  registry-trust-current <registry-url> [token]
  registry-trust-apply <digest> <registry-url> <token> [--allow-rollback]
`);
}

function runtimeVersion(): string {
  const candidates = [
    path.resolve(path.dirname(__filename), "../../../../package.json"),
    path.resolve(path.dirname(__filename), "../../../package.json"),
    path.resolve(require("process").cwd(), "package.json")
  ];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(fs.readFileSync(candidate, "utf8"));
      if (typeof parsed?.version === "string" && parsed.version.trim()) return parsed.version.trim();
    } catch {
      // Try the next candidate.
    }
  }
  throw new Error("Unable to determine WorkProof Runtime version");
}

function proofBundleFromFile(data: any): Record<string, unknown> {
  return {
    version: data.version,
    work: data.work,
    effects: data.effects,
    sagas: data.sagas ?? [],
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

function vaultPublish(proofPath: string, vaultDir: string): void {
  const record = publishProof(proofPath, vaultDir);
  process.stdout.write(JSON.stringify({ status: "published", digest: record.digest, workId: record.workId, proofPath: record.proofPath, artifactCount: Object.keys(record.artifacts).length }, null, 2) + "\n");
}

function vaultRestore(digest: string, vaultDir: string, outputPath: string): void {
  const record = restoreProof(vaultDir, digest, outputPath);
  process.stdout.write(JSON.stringify({ status: "restored", digest: record.digest, workId: record.workId, outputPath }, null, 2) + "\n");
}

function vaultList(vaultDir: string): void {
  process.stdout.write(JSON.stringify(listProofs(vaultDir), null, 2) + "\n");
}

function vaultInspect(digest: string, vaultDir: string): void {
  process.stdout.write(JSON.stringify(inspectProof(vaultDir, digest), null, 2) + "\n");
}

function vaultInventory(vaultDir: string): void {
  process.stdout.write(JSON.stringify(inventoryVault(vaultDir), null, 2) + "\n");
}

function vaultRetain(digest: string, vaultDir: string, retentionClass: string, namespace?: string): void {
  if (!["ephemeral", "standard", "long", "permanent"].includes(retentionClass)) throw new Error("Invalid retention class");
  const result = setRetentionClass(vaultDir, digest, "proof", retentionClass as any, namespace);
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

function vaultPin(digest: string, vaultDir: string, reason?: string, namespace?: string, expiresAt?: string): void {
  const result = pinRetention(vaultDir, digest, "proof", reason, namespace, expiresAt);
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

function vaultUnpin(digest: string, vaultDir: string): void {
  process.stdout.write(JSON.stringify({ unpinned: unpinRetention(vaultDir, digest, "proof") }, null, 2) + "\n");
}

function vaultGc(vaultDir: string, args: string[]): void {
  const execute = args.includes("--execute");
  const namespaceIndex = args.indexOf("--namespace");
  if (namespaceIndex >= 0 && !args[namespaceIndex + 1]) throw new Error("Namespace value is required");
  const namespace = namespaceIndex >= 0 ? args[namespaceIndex + 1] : undefined;
  const result = execute ? executeGarbageCollection(vaultDir, namespace ? { namespace } : {}) : planGarbageCollection(vaultDir, namespace ? { namespace } : {});
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

function vaultRepair(vaultDir: string): void {
  process.stdout.write(JSON.stringify(repairVaultIndex(vaultDir), null, 2) + "\n");
}

function registryAuthInit(policyPath: string): void {
  if (fs.existsSync(policyPath)) throw new Error("Registry auth policy already exists");
  saveAuthPolicy(policyPath, createAuthPolicy());
  process.stdout.write(JSON.stringify({ status: "initialized", policy: policyPath }, null, 2) + "\n");
}

function registryAuthAdd(policyPath: string, credentialId: string, permissionSpec: string, namespace?: string, label?: string): void {
  const permissionMap: Record<string, string[]> = {
    read: ["read"],
    write: ["write"],
    trust: ["trust"],
    readwrite: ["read", "write"],
    readtrust: ["read", "trust"],
    writetrust: ["write", "trust"],
    readwritetrust: ["read", "write", "trust"]
  };
  const permissions = permissionMap[permissionSpec] ?? null;
  if (!permissions) throw new Error("Permission must be read, write, trust, readwrite, readtrust, writetrust, or readwritetrust");
  const policy = loadAuthPolicy(policyPath);
  const issued = issueCredential({ id: credentialId, permissions, ...(namespace ? { namespace } : {}), ...(label ? { label } : {}) });
  const next = addIssuedCredential(policy, issued);
  saveAuthPolicy(policyPath, next);
  process.stdout.write(JSON.stringify({
    status: "issued",
    policy: policyPath,
    credentialId: issued.credential.id,
    permissions: issued.credential.permissions,
    namespace: issued.credential.namespace ?? null,
    token: issued.token
  }, null, 2) + "\n");
}

async function registryTrustPublish(snapshotPath: string, registryUrl: string, token: string): Promise<void> {
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
  const result = await publishTrustSnapshotToRegistry(registryUrl, snapshot, token);
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

async function registryTrustPull(digest: string, registryUrl: string, outputPath: string, token: string): Promise<void> {
  const snapshot = await getTrustSnapshotFromRegistry(registryUrl, digest, token);
  fs.writeFileSync(outputPath, JSON.stringify(snapshot, null, 2) + "\n", "utf8");
  process.stdout.write(JSON.stringify({ status: "pulled", digest, outputPath, epoch: snapshot.epoch }, null, 2) + "\n");
}

async function registryTrustList(registryUrl: string, token?: string): Promise<void> {
  const records = await listTrustSnapshotsFromRegistry(registryUrl, token);
  process.stdout.write(JSON.stringify(records, null, 2) + "\n");
}

async function registryTrustCurrent(registryUrl: string, token?: string): Promise<void> {
  const snapshot = await getCurrentTrustSnapshotFromRegistry(registryUrl, token);
  process.stdout.write(JSON.stringify(snapshot, null, 2) + "\n");
}

async function registryTrustApply(digest: string, registryUrl: string, token: string, allowRollback: boolean): Promise<void> {
  const result = await applyTrustSnapshotToRegistry(registryUrl, digest, token, allowRollback);
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

function registryAuthRevoke(credentialId: string, policyPath: string, reason?: string): void {
  const policy = loadAuthPolicy(policyPath);
  const next = revokeCredential(policy, credentialId, reason);
  saveAuthPolicy(policyPath, next);
  const record = next.credentials.find((item: any) => item.id === credentialId);
  process.stdout.write(JSON.stringify({
    status: "revoked",
    policy: policyPath,
    credentialId,
    revokedAt: record?.revokedAt ?? null
  }, null, 2) + "\n");
}

function registryAuthList(policyPath: string): void {
  const policy = loadAuthPolicy(policyPath);
  process.stdout.write(JSON.stringify(policy.credentials.map((item: any) => ({
    id: item.id,
    permissions: item.permissions,
    namespace: item.namespace ?? null,
    label: item.label ?? null,
    createdAt: item.createdAt,
    revokedAt: item.revokedAt ?? null
  })), null, 2) + "\n");
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

function registerRuntimePacks(registry: any, verification: any): void {
  registerLocalPack(registry);
  registerResearchPack(registry, verification);
  registerWebDiscoveryPack(registry, verification);
  registerPublicationPack(registry, verification);
  registerLocalBrowserPack(registry, verification);
  registerSQLitePack(registry, verification);
  registerDataTransformPack(registry, verification);
  registerMessageOutboxPack(registry, verification);
  registerGitLocalPack(registry, verification);
}

function writeMissionProof(work: any, spec: any): void {
  const proof = buildProofBundle(work);
  const integrity = buildIntegrityManifest(work);
  const proofPath = spec.proofPath ?? `./${work.id}.json`;
  fs.writeFileSync(proofPath, JSON.stringify({ ...proof, integrity }, null, 2), "utf8");
  process.stdout.write(JSON.stringify({
    id: work.id,
    status: work.status,
    proof: proofPath,
    events: work.events.length,
    effects: work.effects.length,
    integrity: integrity.digest
  }, null, 2) + "\n");
  if (work.status !== "verified") process.exitCode = 2;
}

async function runMission(file: string): Promise<void> {
  const spec = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!spec?.objective || !Array.isArray(spec?.steps)) throw new Error("Mission spec requires objective and steps[]");
  const store = new WorkStore();
  const registry = new CapabilityRegistry();
  const verification = new VerificationEngine();
  registerRuntimePacks(registry, verification);
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
  writeMissionProof(work, spec);
}

async function resumeMission(workId: string, file: string): Promise<void> {
  if (!/^[A-Za-z0-9._-]+$/.test(workId)) throw new Error("Invalid work id");
  const spec = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!spec?.objective || !Array.isArray(spec?.steps)) throw new Error("Mission spec requires objective and steps[]");
  const repo = new JsonWorkRepository(spec.workDirectory ?? "./work-runs");
  const work = repo.load(workId);
  if (work.contract?.objective !== spec.objective) {
    throw new Error("Mission objective does not match persisted Work Object");
  }
  if (work.status === "verified") {
    writeMissionProof(work, spec);
    return;
  }
  if (work.status === "cancelled") {
    throw new Error("Cannot resume a cancelled Work Object");
  }
  const store = new WorkStore();
  store.register(work);
  const registry = new CapabilityRegistry();
  const verification = new VerificationEngine();
  registerRuntimePacks(registry, verification);
  const engine = new WorkEngine(store, registry, verification, async () => false, spec.policy, repo);
  await engine.run(work, spec.steps);
  writeMissionProof(work, spec);
}
const [, , command, firstArg, secondArg, thirdArg, fourthArg, fifthArg, sixthArg] = process.argv;
if (!command || command === "--help" || command === "-h" || command === "help") {
  usage();
  process.exitCode = command ? 0 : 1;
} else if (command === "--version" || command === "-v" || command === "version") {
  process.stdout.write(runtimeVersion() + "\n");
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
} else if (command === "registry-auth-init") {
  if (!firstArg) { usage(); process.exitCode = 1; }
  else {
    try { registryAuthInit(firstArg); }
    catch (error) { process.stderr.write(String(error) + "\n"); process.exitCode = 1; }
  }
} else if (command === "registry-auth-add") {
  if (!firstArg || !secondArg || !thirdArg) { usage(); process.exitCode = 1; }
  else {
    try { registryAuthAdd(firstArg, secondArg, thirdArg, fourthArg, fifthArg); }
    catch (error) { process.stderr.write(String(error) + "\n"); process.exitCode = 1; }
  }
} else if (command === "registry-auth-revoke") {
  if (!firstArg || !secondArg) { usage(); process.exitCode = 1; }
  else {
    try { registryAuthRevoke(firstArg, secondArg, thirdArg); }
    catch (error) { process.stderr.write(String(error) + "\n"); process.exitCode = 1; }
  }
} else if (command === "registry-trust-publish") {
  if (!firstArg || !secondArg || !thirdArg) { usage(); process.exitCode = 1; }
  else registryTrustPublish(firstArg, secondArg, thirdArg).catch(error => { process.stderr.write(String(error) + "\n"); process.exitCode = 1; });
} else if (command === "registry-trust-pull") {
  if (!firstArg || !secondArg || !thirdArg || !fourthArg) { usage(); process.exitCode = 1; }
  else registryTrustPull(firstArg, secondArg, thirdArg, fourthArg).catch(error => { process.stderr.write(String(error) + "\n"); process.exitCode = 1; });
} else if (command === "registry-trust-list") {
  if (!firstArg) { usage(); process.exitCode = 1; }
  else registryTrustList(firstArg, secondArg).catch(error => { process.stderr.write(String(error) + "\n"); process.exitCode = 1; });
} else if (command === "registry-trust-current") {
  if (!firstArg) { usage(); process.exitCode = 1; }
  else registryTrustCurrent(firstArg, secondArg).catch(error => { process.stderr.write(String(error) + "\n"); process.exitCode = 1; });
} else if (command === "registry-trust-apply") {
  if (!firstArg || !secondArg || !thirdArg) { usage(); process.exitCode = 1; }
  else registryTrustApply(firstArg, secondArg, thirdArg, fourthArg === "--allow-rollback").catch(error => { process.stderr.write(String(error) + "\n"); process.exitCode = 1; });
} else if (command === "registry-auth-list") {
  if (!firstArg) { usage(); process.exitCode = 1; }
  else {
    try { registryAuthList(firstArg); }
    catch (error) { process.stderr.write(String(error) + "\n"); process.exitCode = 1; }
  }
} else if (command === "vault-publish") {
  if (!firstArg || !secondArg) { usage(); process.exitCode = 1; }
  else {
    try { vaultPublish(firstArg, secondArg); }
    catch (error) { process.stderr.write(String(error) + "\n"); process.exitCode = 1; }
  }
} else if (command === "vault-restore") {
  if (!firstArg || !secondArg || !thirdArg) { usage(); process.exitCode = 1; }
  else {
    try { vaultRestore(firstArg, secondArg, thirdArg); }
    catch (error) { process.stderr.write(String(error) + "\n"); process.exitCode = 1; }
  }
} else if (command === "vault-list") {
  if (!firstArg) { usage(); process.exitCode = 1; }
  else {
    try { vaultList(firstArg); }
    catch (error) { process.stderr.write(String(error) + "\n"); process.exitCode = 1; }
  }
} else if (command === "vault-inspect") {
  if (!firstArg || !secondArg) { usage(); process.exitCode = 1; }
  else {
    try { vaultInspect(firstArg, secondArg); }
    catch (error) { process.stderr.write(String(error) + "\n"); process.exitCode = 1; }
  }
 } else if (command === "vault-inventory") {
  if (!firstArg) { usage(); process.exitCode = 1; }
  else {
    try { vaultInventory(firstArg); }
    catch (error) { process.stderr.write(String(error) + "\n"); process.exitCode = 1; }
  }
} else if (command === "vault-retain") {
  if (!firstArg || !secondArg || !thirdArg) { usage(); process.exitCode = 1; }
  else {
    try { vaultRetain(firstArg, secondArg, thirdArg, fourthArg); }
    catch (error) { process.stderr.write(String(error) + "\n"); process.exitCode = 1; }
  }
} else if (command === "vault-pin") {
  if (!firstArg || !secondArg) { usage(); process.exitCode = 1; }
  else {
    try { vaultPin(firstArg, secondArg, thirdArg, fourthArg, fifthArg); }
    catch (error) { process.stderr.write(String(error) + "\n"); process.exitCode = 1; }
  }
} else if (command === "vault-unpin") {
  if (!firstArg || !secondArg) { usage(); process.exitCode = 1; }
  else {
    try { vaultUnpin(firstArg, secondArg); }
    catch (error) { process.stderr.write(String(error) + "\n"); process.exitCode = 1; }
  }
} else if (command === "vault-gc") {
  if (!firstArg) { usage(); process.exitCode = 1; }
  else {
    try {
      vaultGc(firstArg, [secondArg, thirdArg, fourthArg, fifthArg, sixthArg].filter((value) => Boolean(value)));
    } catch (error) { process.stderr.write(String(error) + "\n"); process.exitCode = 1; }
  }
} else if (command === "vault-repair") {
  if (!firstArg) { usage(); process.exitCode = 1; }
  else {
    try { vaultRepair(firstArg); }
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
} else if (command === "resume") {
  if (!firstArg || !secondArg) { usage(); process.exitCode = 1; }
  else resumeMission(firstArg, secondArg).catch(error => { process.stderr.write(String(error) + "\n"); process.exitCode = 1; });
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
