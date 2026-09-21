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

function usage(): void {
  process.stdout.write(`workctl
  run <mission.json>
  inspect <proof.json>
  verify <proof.json>
  summarize <proof.json>
`);
}

async function runMission(file: string): Promise<void> {
  const spec = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!spec?.objective || !Array.isArray(spec.steps))) throw new Error("Mission spec requires objective and steps[]");
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
  const proof = spec.proofPath ?? `./${work.id}.json`;
  fs.writeFileSync(proof, JSON.stringify({ work, effects: work.effects, artifacts: work.artifacts, verification: work.verification, events: work.events }, null, 2), "utf8");
  process.stdout.write(JSON.stringify({ id: work.id, status: work.status, proof, events: work.events.length, effects: work.effects.length }, null, 2) + "\n");
  if (work.status !== "verified") process.exitCode = 2;
}

const [, , command, file] = process.argv;
if (!command || !file) { usage(); process.exitCode = 1; }
else if (command === "run") { runMission(file).catch(error => { process.stderr.write(String(error) + "\n"); process.exitCode = 1; }); }
else {
  const raw = fs.readFileSync(file, "utf8");
  const data = JSON.parse(raw);
  if (command === "inspect") {
    process.stdout.write(JSON.stringify(data, null, 2) + "\n");
  } else if (command === "summarize") {
    process.stdout.write(`${data.work.status}: ${data.work.objective}\nEffects: ${data.effects.length}\nArtifacts: ${data.artifacts.length}\nEvents: ${data.events.length}\n`);
  } else if (command === "verify") {
    const status = data.verification?.status ?? "unverified";
    process.stdout.write(`${status}\n`);
    process.exitCode = status === "verified" ? 0 : 2;
  } else { usage(); process.exitCode = 1; }
}

export {};
