import { WorkStore } from "../packages/core/src/work";
import { CapabilityRegistry } from "../packages/capabilities/src/registry";
import { VerificationEngine } from "../packages/verification/src/engine";
import { WorkEngine } from "../packages/runtime/src/engine";
import { registerResearchPack } from "../packages/packs/src/research-pack";
import { registerWebDiscoveryPack } from "../packages/packs/src/web-discovery-pack";
import { registerGitLocalPack } from "../packages/packs/src/git-local-pack";
import { selectCapability } from "../packages/runtime/src/router";
import { Capability, CapabilityReceipt } from "../packages/core/src/types";
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

type CaseResult = {
  id: string;
  status: string;
  effects: number;
  artifacts: number;
  events: number;
  details: Record<string, unknown> & { postRequests?: number; reconciled?: boolean; substituted?: boolean };
};



async function runResearch(): Promise<CaseResult> {
  const store = new WorkStore(); const registry = new CapabilityRegistry(); const verification = new VerificationEngine();
  registerResearchPack(registry, verification);
  const selected = selectCapability(registry, { operation: "research_suppliers", riskClass: "read", preferred: ["pack.research.local"] });
  const outputDir = benchmarkTempDir("workproof-m001-");
  const output = path.join(outputDir, "benchmark-research.json");
  try { fs.unlinkSync(output); } catch {}
  const work = store.create({ objective: "Research-to-artifact", inputs: { dataPath: "./lab/data/suppliers.json", outputPath: output, minRecords: 4 }, success: [{ id: "artifact", description: "Unique supplier artifact exists", verifier: "pack.research.artifact", required: true }], deliverables: [output], riskClass: "read" });
  try {
    const engine = new WorkEngine(store, registry, verification, async (_work, effectId) => Boolean(work.effects.find((e: any) => e.effectId === effectId)?.receipt));
    await engine.run(work, [{ id: "research", operation: "research_suppliers", capability: selected.name, input: { dataPath: "./lab/data/suppliers.json", outputPath: output, minRecords: 4 }, idempotencyKey: `benchmark:${output}`, riskClass: "read" }]);
    return { id: "M001", status: work.status, effects: work.effects.length, artifacts: work.artifacts.length, events: work.events.length, details: { selectedCapability: selected.name, records: JSON.parse(fs.readFileSync(output, "utf8")).length } };
  } finally {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
}

async function runWebDiscovery(): Promise<CaseResult> {
  const rows = [
    { name: "Alpha", website: "https://alpha.example", source: "catalog" },
    { name: "Alpha duplicate", website: "https://ALPHA.example", source: "catalog" },
    { name: "Beta", website: "https://beta.example", source: "catalog" },
    { name: "Gamma", website: "https://gamma.example", source: "catalog" }
  ];
  const server = http.createServer((_req: any, res: any) => { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ results: rows })); });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}/search`;
  const outputDir = benchmarkTempDir("workproof-m002-");
  const output = path.join(outputDir, "benchmark-discovery.json");
  try { fs.unlinkSync(output); } catch {}
  try {
    const store = new WorkStore(); const registry = new CapabilityRegistry(); const verification = new VerificationEngine(); registerWebDiscoveryPack(registry, verification);
    const work = store.create({ objective: "Discover records over HTTP", inputs: { searchUrl: base, query: "suppliers", minRecords: 3, outputPath: output }, success: [{ id: "artifact", description: "Unique sourced artifact exists", verifier: "pack.discovery.http", required: true }], deliverables: [output], riskClass: "read" });
    const engine = new WorkEngine(store, registry, verification, async () => false);
    await engine.run(work, [{ id: "discover", operation: "discover_records", capability: "pack.discovery.http", input: { searchUrl: base, query: "suppliers", minRecords: 3, outputPath: output }, idempotencyKey: "benchmark:discovery", riskClass: "read" }]);
    return { id: "M002", status: work.status, effects: work.effects.length, artifacts: work.artifacts.length, events: work.events.length, details: { selectedCapability: "pack.discovery.http", records: JSON.parse(fs.readFileSync(output, "utf8")).length } };
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
}


function benchmarkTempDir(prefix: string): string { return fs.mkdtempSync(path.join(os.tmpdir(), prefix)); }
function benchmarkGit(cwd: string, args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

async function runGitChange(): Promise<CaseResult> {
  const root = benchmarkTempDir("workproof-m003-");
  const remote = path.join(root, "remote.git");
  const repoPath = path.join(root, "repo");
  fs.mkdirSync(repoPath);
  benchmarkGit(root, ["init", "--bare", remote]);
  benchmarkGit(repoPath, ["init", "-b", "main"]);
  benchmarkGit(repoPath, ["config", "user.name", "WorkProof Benchmark"]);
  benchmarkGit(repoPath, ["config", "user.email", "benchmark@workproof.local"]);
  fs.writeFileSync(path.join(repoPath, "README.md"), "baseline\n", "utf8");
  benchmarkGit(repoPath, ["add", "--", "README.md"]);
  benchmarkGit(repoPath, ["commit", "-m", "baseline"]);
  try {
    const store = new WorkStore(); const registry = new CapabilityRegistry(); const verification = new VerificationEngine();
    registerGitLocalPack(registry, verification);
    const input = { repoPath, remotePath: remote, branch: "main", filePath: "artifact.txt", content: "verified git artifact\n", commitMessage: "benchmark: publish verified artifact" };
    const work = store.create({
      objective: "Inspect, mutate, test, commit, push, and verify a Git change",
      inputs: input,
      success: [{ id: "remote", description: "Remote branch contains the expected committed artifact", verifier: "pack.git.local.change", required: true }],
      deliverables: ["remote Git commit"], riskClass: "local_write"
    });
    const engine = new WorkEngine(store, registry, verification, async () => false);
    await engine.run(work, [{ id: "git-change", operation: "update_commit_push", capability: "pack.git.local.change", input, idempotencyKey: "benchmark:m003:git-change", riskClass: "local_write" }]);
    return { id: "M003", status: work.status, effects: work.effects.length, artifacts: work.artifacts.length, events: work.events.length,
      details: { remoteCommit: benchmarkGit(remote, ["rev-parse", "main"]), workingTree: benchmarkGit(repoPath, ["status", "--porcelain"]), branch: benchmarkGit(repoPath, ["symbolic-ref", "--short", "HEAD"]) } };
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

class BenchmarkAmbiguousCreate implements Capability {
  name = "benchmark.http.order.create"; version = "0.1.0"; operations = ["create_order"]; riskClass = "external_write" as const;
  constructor(private readonly baseUrl: string, private readonly counts: { posts: number }) {}
  async execute(request: any): Promise<CapabilityReceipt> {
    const body = JSON.stringify(request.input); this.counts.posts += 1;
    return await new Promise<any>(resolve => {
      const req = http.request(this.baseUrl + "/orders", { method: "POST", headers: { "content-type": "application/json", "content-length": Buffer.byteLength(body) } }, (res: any) => {
        res.resume(); res.on("end", () => resolve({ status: "accepted" }));
      });
      req.on("error", () => resolve({ status: "ambiguous", data: { reason: "acknowledgement lost" } }));
      req.write(body); req.end();
    });
  }
}

class BenchmarkOrderVerifier {
  name = "benchmark.http.order.exists";
  constructor(private readonly baseUrl: string) {}
  async verify(ctx: any) {
    const id = String(ctx.work.contract.inputs?.orderId ?? "");
    try {
      const response = await fetch(this.baseUrl + "/orders/" + encodeURIComponent(id));
      if (!response.ok) return { id: ctx.criterion.id, criterion: ctx.criterion.description, passed: false, evidence: [] };
      const body = await response.json();
      const passed = String(body.id) === id && String(body.email) === "benchmark@example.com";
      return { id: ctx.criterion.id, criterion: ctx.criterion.description, passed, details: "orderExists=" + passed,
        evidence: passed ? [{ id: "benchmark:order:" + id, kind: "http-public-state", uri: this.baseUrl + "/orders/" + encodeURIComponent(id) }] : [] };
    } catch (error) { return { id: ctx.criterion.id, criterion: ctx.criterion.description, passed: false, details: String(error), evidence: [] }; }
  }
}

async function runAmbiguousExternalEffect(): Promise<CaseResult> {
  const orders = new Map<string, any>(); const counts = { posts: 0 };
  const server = http.createServer((req: any, res: any) => {
    if (req.method === "POST" && req.url === "/orders") {
      let raw = ""; req.on("data", (chunk: any) => raw += chunk.toString());
      req.on("end", () => { const input = JSON.parse(raw); orders.set(String(input.orderId), { id: input.orderId, email: input.email }); req.socket.destroy(); });
      return;
    }
    if (req.method === "GET" && req.url?.startsWith("/orders/")) {
      const id = decodeURIComponent(req.url.slice("/orders/".length)); const order = orders.get(id);
      if (!order) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(order)); return;
    }
    res.writeHead(404); res.end();
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = "http://127.0.0.1:" + (server.address() as any).port;
  try {
    const store = new WorkStore(); const registry = new CapabilityRegistry(); const verification = new VerificationEngine();
    const capability = new BenchmarkAmbiguousCreate(baseUrl, counts); registry.register(capability); verification.register(new BenchmarkOrderVerifier(baseUrl));
    const input = { orderId: "M004-1", email: "benchmark@example.com" };
    const work = store.create({ objective: "Create exactly one order despite lost acknowledgement", inputs: input,
      success: [{ id: "exists", description: "Order exists with exact requested state", verifier: "benchmark.http.order.exists", required: true }],
      deliverables: ["one order"], riskClass: "external_write" });
    const engine = new WorkEngine(store, registry, verification, async (_work, effectId) => {
      const response = await fetch(baseUrl + "/orders/M004-1"); if (!response.ok) return false;
      const effect = work.effects.find((e: any) => e.effectId === effectId); if (effect) effect.lastObservedState = await response.json(); return true;
    });
    await engine.run(work, [{ id: "create", operation: "create_order", capability: capability.name, input,
      idempotencyKey: "benchmark:m004:order", riskClass: "external_write", maxAttempts: 3 }]);
    return { id: "M004", status: work.status, effects: work.effects.length, artifacts: work.artifacts.length, events: work.events.length,
      details: { postRequests: counts.posts, duplicatesPrevented: Math.max(0, counts.posts - 1), reconciled: work.effects[0]?.status === "verified",
        lastObservedState: work.effects[0]?.lastObservedState ?? null } };
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
}

class BenchmarkPrimary implements Capability {
  name = "benchmark.primary.publish"; version = "0.1.0"; operations = ["publish_record"]; riskClass = "local_write" as const; calls = 0;
  async execute(): Promise<CapabilityReceipt> { this.calls += 1; return { status: "ambiguous", data: { reason: "simulated primary outage" } }; }
}
class BenchmarkFallback implements Capability {
  name = "benchmark.fallback.publish"; version = "0.1.0"; operations = ["publish_record"]; riskClass = "local_write" as const;
  constructor(private readonly state: Map<string, string>) {}
  async execute(request: any): Promise<CapabilityReceipt> { this.state.set(String(request.input.key), String(request.input.value)); return { status: "accepted", externalEffectId: "fallback:" + String(request.input.key) }; }
}
class BenchmarkRecordVerifier {
  name = "benchmark.record.verify";
  constructor(private readonly state: Map<string, string>) {}
  async verify(ctx: any) {
    const key = String(ctx.work.contract.inputs?.key ?? ""); const value = this.state.get(key);
    const passed = value === String(ctx.work.contract.inputs?.value ?? "");
    return { id: ctx.criterion.id, criterion: ctx.criterion.description, passed, details: "storedValue=" + (value ?? "missing"),
      evidence: passed ? [{ id: "benchmark:record:" + key, kind: "record-state", metadata: { key, value: value ?? "" } }] : [] };
  }
}

async function runCapabilitySubstitution(): Promise<CaseResult> {
  const state = new Map<string, string>(); const store = new WorkStore(); const registry = new CapabilityRegistry(); const verification = new VerificationEngine();
  const primary = new BenchmarkPrimary(); registry.register(primary); registry.register(new BenchmarkFallback(state)); verification.register(new BenchmarkRecordVerifier(state));
  const input = { key: "M005-1", value: "verified" };
  const work = store.create({ objective: "Publish using a compatible capability after primary failure", inputs: input,
    success: [{ id: "record", description: "The requested record exists with exact value", verifier: "benchmark.record.verify", required: true }],
    deliverables: ["verified record"], riskClass: "local_write" });
  const engine = new WorkEngine(store, registry, verification, async () => false);
  await engine.run(work, [{ id: "publish", operation: "publish_record", capability: primary.name, input,
    idempotencyKey: "benchmark:m005:record", riskClass: "local_write", maxAttempts: 4 }]);
  return { id: "M005", status: work.status, effects: work.effects.length, artifacts: work.artifacts.length, events: work.events.length,
    details: { primaryCalls: primary.calls, substituted: work.events.some((e: any) => e.type === "recovery.substitute"), fallbackStored: state.get(input.key) === input.value } };
}

export async function runBenchmark() {
  const results = [await runResearch(), await runWebDiscovery(), await runGitChange(), await runAmbiguousExternalEffect(), await runCapabilitySubstitution()];
  const verified = results.filter(r => r.status === "verified").length;
  const evidenceComplete = results.filter(r => r.artifacts > 0).length;
  const m004 = results.find(r => r.id === "M004");
  const summary = {
    suite: "Work Completion Benchmark V3",
    results,
    cases: results,
    metrics: {
      totalCases: results.length,
      verifiedCases: verified,
      verifiedCompletionRate: results.length ? verified / results.length : 0,
      falseDoneCount: results.filter(r => r.status === "verified" && r.artifacts === 0).length,
      duplicateExternalEffectCount: Math.max(0, Number(m004?.details.postRequests ?? 0) - 1),
      ambiguousOutcomeResolvedCount: results.filter(r => r.id === "M004" && Boolean(r.details.reconciled)).length,
      capabilitySubstitutionCount: results.filter(r => r.id === "M005" && Boolean(r.details.substituted)).length,
      evidenceCompleteRate: results.length ? evidenceComplete / results.length : 0,
      humanInterventionCount: 0
    },
    passed: verified === results.length && evidenceComplete === results.length
  };
  fs.writeFileSync("./benchmark-result.json", JSON.stringify(summary, null, 2) + "\n");
  return summary;
}
if (process.argv[1] && path.basename(process.argv[1]) === "benchmark.js") { runBenchmark().then(summary => { process.stdout.write(JSON.stringify(summary, null, 2) + "\n"); if (!summary.passed) process.exitCode = 1; }).catch((err: Error) => { process.stderr.write(String(err) + "\n"); process.exitCode = 1; }); }
export {};
