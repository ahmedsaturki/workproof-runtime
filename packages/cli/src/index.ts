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
const { exportPortableProof, verifyPortableProof, importPortableProof } = require("../../evidence/src/portable.js");
const { assessProofCompatibility, compatibilityPolicy } = require("../../evidence/src/compatibility.js");
const { setRetentionClass, pinRetention, unpinRetention, inventoryVault, planGarbageCollection, executeGarbageCollection, repairVaultIndex } = require("../../evidence/src/retention.js");
const { createAuthPolicy, loadAuthPolicy, saveAuthPolicy, issueCredential, addIssuedCredential, revokeCredential } = require("../../registry/src/auth.js");
const { publishTrustSnapshotToRegistry, getTrustSnapshotFromRegistry, listTrustSnapshotsFromRegistry, getCurrentTrustSnapshotFromRegistry, applyTrustSnapshotToRegistry } = require("../../registry/src/client.js");
const { runDoctor } = require("../../doctor/src/index.js");

function usage(): void {
  process.stdout.write(`workctl
  run <mission.json>
  resume <work-id> <mission.json>
  inspect <proof.json>
  verify <proof.json> [trust-policy.json] [--require-trusted]
  summarize <proof.json>
  doctor
  proof-export <proof.json> <bundle-dir>
  proof-bundle-verify <bundle-dir>
  proof-import <bundle-dir> <output-dir>
  compatibility <proof.json>
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