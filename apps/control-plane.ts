const fs = require("fs");
const path = require("path");
import { WorkStore } from "../packages/core/src/work";
import { RiskClass, WorkObject } from "../packages/core/src/types";
import { CapabilityRegistry } from "../packages/capabilities/src/registry";
import { VerificationEngine } from "../packages/verification/src/engine";
import { WorkEngine, WorkStep } from "../packages/runtime/src/engine";
import { JsonWorkRepository } from "../packages/storage/src/json";
import { startControlPlane } from "../packages/control-plane/src/http";
import { loadAuthPolicy } from "../packages/registry/src/auth";
import { registerLocalPack } from "../packages/packs/src/local-pack";
import { registerResearchPack } from "../packages/packs/src/research-pack";
import { registerWebDiscoveryPack } from "../packages/packs/src/web-discovery-pack";
import { registerPublicationPack } from "../packages/packs/src/publication-pack";
import { registerLocalBrowserPack } from "../packages/packs/src/browser-local-pack";
import { registerSQLitePack } from "../packages/packs/src/sqlite-pack";
import { registerDataTransformPack } from "../packages/packs/src/data-transform-pack";
import { registerMessageOutboxPack } from "../packages/packs/src/message-outbox-pack";
import { registerGitLocalPack } from "../packages/packs/src/git-local-pack";
import { buildProofBundle } from "../packages/evidence/src/bundle";
import { buildIntegrityManifest } from "../packages/evidence/src/integrity";
import { createOtlpLogExporterFromEnv } from "../packages/telemetry/src/otel";

interface RuntimeConfig {
  host: string;
  port: number;
  workDirectory: string;
  missionDirectory: string;
  proofDirectory: string;
  idempotencyDbPath: string;
  auditPath: string;
  authPolicyPath?: string;
}

function readRuntimeConfig(): RuntimeConfig {
  const workDirectory = process.env.WORKPROOF_WORK_DIRECTORY ?? "./work-runs";
  return {
    host: process.env.WORKPROOF_CONTROL_PLANE_HOST ?? "127.0.0.1",
    port: Number(process.env.WORKPROOF_CONTROL_PLANE_PORT ?? "8789"),
    workDirectory,
    missionDirectory: process.env.WORKPROOF_MISSION_DIRECTORY ?? path.join(workDirectory, "missions"),
    proofDirectory: process.env.WORKPROOF_PROOF_DIRECTORY ?? path.join(workDirectory, "proofs"),
    idempotencyDbPath: process.env.WORKPROOF_IDEMPOTENCY_DB ?? path.join(workDirectory, "control-plane.sqlite"),
    auditPath: process.env.WORKPROOF_CONTROL_AUDIT_PATH ?? path.join(workDirectory, "control-audit.jsonl"),
    authPolicyPath: process.env.WORKPROOF_AUTH_POLICY
  };
}

function assertRuntimeConfig(config: RuntimeConfig): void {
  const loopbackHosts = new Set(["127.0.0.1", "localhost", "::1"]);
  if (!Number.isInteger(config.port) || config.port < 0 || config.port > 65535) throw new Error("WORKPROOF_CONTROL_PLANE_PORT must be a valid TCP port");
  if (!loopbackHosts.has(config.host) && !config.authPolicyPath) {
    throw new Error("Refusing non-loopback control-plane binding without WORKPROOF_AUTH_POLICY");
  }
}

function runtimeVersion(): string {
  const candidates = [
    path.resolve(path.dirname(__filename), "../../package.json"),
    path.resolve(require("process").cwd(), "package.json")
  ];
  for (const candidate of candidates) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(candidate, "utf8"));
      if (typeof packageJson.version === "string" && packageJson.version.trim()) return packageJson.version.trim();
    } catch {
      // Try the next known package location.
    }
  }
  const environmentVersion = process.env.npm_package_version;
  if (environmentVersion && environmentVersion.trim()) return environmentVersion.trim();
  throw new Error("Unable to determine WorkProof Runtime version");
}

function registerRuntimePacks(registry: CapabilityRegistry, verification: VerificationEngine): void {
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

function createRuntimeRegistry(): CapabilityRegistry {
  const registry = new CapabilityRegistry();
  const verification = new VerificationEngine();
  registerRuntimePacks(registry, verification);
  return registry;
}

const controlCapabilityRegistry = createRuntimeRegistry();

function safeWorkId(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9._-]+$/.test(value)) throw new Error("Invalid work id");
  return value;
}

function validateRisk(value: unknown, fallback: RiskClass): RiskClass {
  if (value === undefined) return fallback;
  if (value === "read" || value === "local_write" || value === "external_write" || value === "destructive" || value === "financial") return value;
  throw new Error("Invalid riskClass");
}

function validateSteps(value: unknown, contractRisk: RiskClass): WorkStep[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("steps must be an array");
  return value.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`Invalid step at index ${index}`);
    const item = raw as Record<string, unknown>;
    if (typeof item.id !== "string" || !item.id.trim()) throw new Error(`Step ${index} requires id`);
    if (typeof item.operation !== "string" || !item.operation.trim()) throw new Error(`Step ${item.id} requires operation`);
    if (typeof item.idempotencyKey !== "string" || !/^[A-Za-z0-9._~-]{1,200}$/.test(item.idempotencyKey)) {
      throw new Error(`Step ${item.id} requires a valid idempotencyKey`);
    }
    return {
      id: item.id,
      operation: item.operation,
      capability: typeof item.capability === "string" ? item.capability : undefined,
      input: item.input,
      idempotencyKey: item.idempotencyKey,
      riskClass: validateRisk(item.riskClass, contractRisk),
      preferredCapabilities: Array.isArray(item.preferredCapabilities) ? item.preferredCapabilities.filter((v): v is string => typeof v === "string") : undefined,
      maxAttempts: typeof item.maxAttempts === "number" ? item.maxAttempts : undefined
    };
  });
}

function proofPath(work: WorkObject, config: RuntimeConfig): string {
  return path.join(config.proofDirectory, `${safeWorkId(work.id)}.json`);
}

function persistProof(work: WorkObject, config: RuntimeConfig): void {
  const proof = buildProofBundle(work);
  const integrity = buildIntegrityManifest(work);
  fs.writeFileSync(proofPath(work, config), JSON.stringify({ ...proof, integrity }, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
}

function missionPath(workId: string, config: RuntimeConfig): string {
  return path.join(config.missionDirectory, `${safeWorkId(workId)}.json`);
}

function saveMission(work: WorkObject, steps: WorkStep[], config: RuntimeConfig): void {
  fs.writeFileSync(missionPath(work.id, config), JSON.stringify({
    objective: work.contract.objective,
    inputs: work.contract.inputs ?? {},
    constraints: work.contract.constraints ?? {},
    success: work.contract.success,
    deliverables: work.contract.deliverables,
    riskClass: work.contract.riskClass,
    approvalRequired: Boolean(work.contract.approvalRequired),
    steps
  }, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
}

function loadMission(work: WorkObject, config: RuntimeConfig): WorkStep[] {
  const file = missionPath(work.id, config);
  if (!fs.existsSync(file)) throw new Error("Persisted mission definition is missing for resume");
  const spec = JSON.parse(fs.readFileSync(file, "utf8"));
  return validateSteps(spec.steps, work.contract.riskClass);
}

async function executeMission(input: Record<string, unknown>): Promise<WorkObject> {
  const config = readRuntimeConfig();
  if (typeof input.objective !== "string" || !input.objective.trim()) throw new Error("Dispatch objective is required");
  const riskClass = validateRisk(input.riskClass, "read");
  const steps = validateSteps(input.steps, riskClass);
  const store = new WorkStore();
  const registry = createRuntimeRegistry();
  const verification = new VerificationEngine();
  const work = store.create({
    objective: input.objective,
    inputs: input.inputs && typeof input.inputs === "object" && !Array.isArray(input.inputs) ? input.inputs as Record<string, unknown> : {},
    constraints: input.constraints && typeof input.constraints === "object" && !Array.isArray(input.constraints) ? input.constraints as Record<string, unknown> : {},
    success: Array.isArray(input.success) ? input.success as any : [],
    deliverables: Array.isArray(input.deliverables) ? input.deliverables.filter((v): v is string => typeof v === "string") : [],
    riskClass,
    approvalRequired: Boolean(input.approvalRequired),
    metadata: input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata)
      ? input.metadata as Record<string, unknown>
      : undefined
  });
  saveMission(work, steps, config);
  const repository = new JsonWorkRepository(config.workDirectory);
  const engine = new WorkEngine(store, registry, verification, async () => false, undefined, repository);
  await engine.run(work, steps);
  persistProof(work, config);
  return work;
}

async function resumeMission(work: WorkObject): Promise<WorkObject> {
  const config = readRuntimeConfig();
  const steps = loadMission(work, config);
  const store = new WorkStore();
  store.register(work);
  const registry = createRuntimeRegistry();
  const verification = new VerificationEngine();
  const repository = new JsonWorkRepository(config.workDirectory);
  const engine = new WorkEngine(store, registry, verification, async () => false, undefined, repository);
  await engine.run(work, steps);
  persistProof(work, config);
  return work;
}

async function main(): Promise<void> {
  const config = readRuntimeConfig();
  assertRuntimeConfig(config);
  fs.mkdirSync(config.missionDirectory, { recursive: true });
  fs.mkdirSync(config.proofDirectory, { recursive: true });
  const authPolicy = config.authPolicyPath ? loadAuthPolicy(config.authPolicyPath) : undefined;
  const repository = new JsonWorkRepository(config.workDirectory);
  const telemetry = createOtlpLogExporterFromEnv({
    serviceName: "workproof-control-plane",
    serviceVersion: runtimeVersion()
  });

  const controlPlane = await startControlPlane({
    repository: {
      load: (id: string) => repository.load(id),
      save: (work: WorkObject) => repository.save(work),
      list: () => repository.list()
    },
    authPolicy,
    host: config.host,
    port: config.port,
    auditPath: config.auditPath,
    idempotencyDbPath: config.idempotencyDbPath,
    dispatch: executeMission,
    resume: resumeMission,
    capabilitySource: {
      listCapabilities: () => controlCapabilityRegistry.list().map((capability) => ({
        name: capability.name,
        version: capability.version,
        operations: capability.operations,
        riskClass: capability.riskClass
      }))
    },
    runtimeVersion: runtimeVersion(),
    telemetry
  });

  process.stdout.write(JSON.stringify({
    status: "ready",
    version: runtimeVersion(),
    apiVersion: "1.0",
    host: controlPlane.host,
    port: controlPlane.port,
    workDirectory: config.workDirectory,
    proofDirectory: config.proofDirectory,
    auth: Boolean(authPolicy)
  }, null, 2) + "\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((error) => {
    process.stderr.write(String(error) + "\n");
    process.exitCode = 1;
  });
}
