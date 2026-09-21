import { WorkStore } from "../packages/core/src/work";
import { CapabilityRegistry } from "../packages/capabilities/src/registry";
import { VerificationEngine } from "../packages/verification/src/engine";
import { WorkEngine } from "../packages/runtime/src/engine";
import { registerResearchPack } from "../packages/packs/src/research-pack";
import { registerWebDiscoveryPack } from "../packages/packs/src/web-discovery-pack";
import { selectCapability } from "../packages/runtime/src/router";
import { JsonWorkRepository } from "../packages/storage/src/json";
const fs = require("fs");
const http = require("http");

async function runResearch() {
  const store = new WorkStore(); const registry = new CapabilityRegistry(); const verification = new VerificationEngine();
  registerResearchPack(registry, verification);
  const selected = selectCapability(registry, { operation: "research_suppliers", riskClass: "read", preferred: ["pack.research.local"] });
  const output = "/tmp/benchmark-research.json"; try { fs.unlinkSync(output); } catch {}
  const work = store.create({ objective: "Research-to-artifact", inputs: { dataPath: "./lab/data/suppliers.json", outputPath: output, minRecords: 4 }, success: [{ id: "artifact", description: "Unique supplier artifact exists", verifier: "pack.research.artifact", required: true }], deliverables: [output], riskClass: "read" });
  const engine = new WorkEngine(store, registry, verification, async (_work, effectId) => Boolean(work.effects.find((e: any) => e.effectId === effectId)?.receipt));
  await engine.run(work, [{ id: "research", operation: "research_suppliers", capability: selected.name, input: { dataPath: "./lab/data/suppliers.json", outputPath: output, minRecords: 4 }, idempotencyKey: `benchmark:${output}`, riskClass: "read" }]);
  return { id: "M001", status: work.status, selectedCapability: selected.name, records: JSON.parse(fs.readFileSync(output, "utf8")).length };
}

async function runWebDiscovery() {
  const rows = [
    { name: "Alpha", website: "https://alpha.example", source: "catalog" },
    { name: "Alpha duplicate", website: "https://ALPHA.example", source: "catalog" },
    { name: "Beta", website: "https://beta.example", source: "catalog" },
    { name: "Gamma", website: "https://gamma.example", source: "catalog" }
  ];
  const server = http.createServer((_req: any, res: any) => { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ results: rows })); });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}/search`;
  const output = "/tmp/benchmark-discovery.json"; try { fs.unlinkSync(output); } catch {}
  try {
    const store = new WorkStore(); const registry = new CapabilityRegistry(); const verification = new VerificationEngine(); registerWebDiscoveryPack(registry, verification);
    const work = store.create({ objective: "Discover records over HTTP", inputs: { searchUrl: base, query: "suppliers", minRecords: 3, outputPath: output }, success: [{ id: "artifact", description: "Unique sourced artifact exists", verifier: "pack.discovery.http", required: true }], deliverables: [output], riskClass: "read" });
    const engine = new WorkEngine(store, registry, verification, async () => false);
    await engine.run(work, [{ id: "discover", operation: "discover_records", capability: "pack.discovery.http", input: { searchUrl: base, query: "suppliers", minRecords: 3, outputPath: output }, idempotencyKey: "benchmark:discovery", riskClass: "read" }]);
    return { id: "M002", status: work.status, selectedCapability: "pack.discovery.http", records: JSON.parse(fs.readFileSync(output, "utf8")).length };
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
}

async function main() {
  const results = [await runResearch(), await runWebDiscovery()];
  const summary = { suite: "Work Completion Benchmark V2", results, passed: results.every(r => r.status === "verified") };
  const repo = new JsonWorkRepository("./benchmark-runs"); void repo;
  fs.writeFileSync("./benchmark-result.json", JSON.stringify(summary, null, 2));
  process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
}
main().catch((err: Error) => { process.stderr.write(String(err) + "\n"); process.exitCode = 1; });
export {};
