import { WorkStore } from "../packages/core/src/work";
import { CapabilityRegistry } from "../packages/capabilities/src/registry";
import { executeWithSafety } from "../packages/recovery/src/engine";
import { VerificationEngine } from "../packages/verification/src/engine";
import { buildProofBundle } from "../packages/evidence/src/bundle";
import { Capability, Verifier, EvidenceRef } from "../packages/core/src/types";

const fs = require("fs");
const os = require("os");
const path = require("path");

class LocalFileCreate implements Capability {
  name = "local.file.create";
  version = "0.1.0";
  operations = ["create_file"];
  riskClass = "local_write" as const;
  async execute(request: { operation: string; input: unknown }, ctx: any) {
    const input = request.input as { path: string; content: string };
    fs.writeFileSync(input.path, input.content, "utf8");
    ctx.log("capability.executed", "File created", { path: input.path });
    return { status: "accepted" as const, externalEffectId: `file:${input.path}` };
  }
}

class FileExistsVerifier implements Verifier {
  name = "file.exists";
  async verify(ctx: any) {
    const path = String(ctx.work.contract.inputs?.path ?? "");
    const exists = !!path && fs.existsSync(path);
    const evidence: EvidenceRef[] = exists ? [{ id: `fs:${path}`, kind: "filesystem", uri: path, observedAt: new Date().toISOString() }] : [];
    return { id: ctx.criterion.id, criterion: ctx.criterion.description, passed: exists, details: exists ? "File exists" : "File missing", evidence };
  }
}

async function main() {
  const target = path.join(os.tmpdir(), "work-ecosystem-demo.txt");
  try { fs.unlinkSync(target); } catch {}
  const store = new WorkStore();
  const work = store.create({
    objective: "Create a verified local work artifact",
    inputs: { path: target },
    success: [{ id: "file-created", description: "Output file exists", verifier: "file.exists", required: true }],
    deliverables: [target],
    riskClass: "local_write"
  });
  const registry = new CapabilityRegistry();
  registry.register(new LocalFileCreate());
  const capability = registry.get("local.file.create");
  const effect = store.addEffect(work, capability.name, capability.riskClass, "create:" + target);
  store.transition(work, "running", "Executing first work unit");
  await executeWithSafety({
    work,
    capability,
    request: { operation: "create_file", input: { path: target, content: "verified\n" }, idempotencyKey: effect.idempotencyKey },
    effect,
    registry,
    verifyExternalState: async () => fs.existsSync(target),
    contextLog: (type, message, data) => store.event(work, type, message, data)
  });
  const verifier = new VerificationEngine();
  verifier.register(new FileExistsVerifier());
  await verifier.verify(work);
  const proof = buildProofBundle(work);
  fs.writeFileSync("./mission-proof.json", JSON.stringify(proof, null, 2));
  process.stdout.write(JSON.stringify({ status: work.status, effects: work.effects.length, events: work.events.length }, null, 2) + "\n");
}

main().catch((err) => { process.stderr?.write(String(err) + "\n"); process.exitCode = 1; });

export {};
