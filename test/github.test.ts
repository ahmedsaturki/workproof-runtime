const assert = require("assert");
const test = require("node:test");
const http = require("http");
const fs = require("fs");

const { WorkStore } = require("../packages/core/src/work.js");
const { CapabilityRegistry } = require("../packages/capabilities/src/registry.js");
const { VerificationEngine } = require("../packages/verification/src/engine.js");
const { WorkEngine } = require("../packages/runtime/src/engine.js");
const { registerGitHubPack, findGitHubIssueByMarker } = require("../packages/packs/src/github-pack.js");
const { buildProofBundle } = require("../packages/evidence/src/bundle.js");
const { buildIntegrityManifest, verifyProofIntegrity, canonicalJson } = require("../packages/evidence/src/integrity.js");

type FakeIssue = {
  number: number;
  title: string;
  body: string;
  html_url: string;
  repository_url: string;
  state: string;
};

type FakeGitHub = {
  baseUrl: string;
  server: any;
  issues: FakeIssue[];
  postCalls: number;
};

function startFakeGitHub({ loseCreateAck = false }: { loseCreateAck?: boolean } = {}): Promise<FakeGitHub> {
  const issues: FakeIssue[] = [];
  let postCalls = 0;
  let nextIssue = 1;
  const server = http.createServer((req: any, res: any) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (req.method === "GET" && url.pathname === "/repos/acme/demo") {
      const body = JSON.stringify({ full_name: "acme/demo", default_branch: "main", private: false });
      res.writeHead(200, { "content-type": "application/json" });
      res.end(body);
      return;
    }
    if (req.method === "GET" && url.pathname === "/repos/acme/demo/issues") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(issues));
      return;
    }
    if (req.method === "POST" && url.pathname === "/repos/acme/demo/issues") {
      postCalls++;
      let raw = "";
      req.on("data", (chunk: any) => raw += chunk.toString());
      req.on("end", () => {
        const input = JSON.parse(raw) as { title: string; body: string };
        const number = nextIssue++;
        const issue: FakeIssue = {
          number,
          title: input.title,
          body: input.body,
          html_url: `http://127.0.0.1/issues/${number}`,
          repository_url: "http://127.0.0.1/repos/acme/demo",
          state: "open"
        };
        issues.push(issue);
        if (loseCreateAck) {
          req.socket.destroy();
          return;
        }
        res.writeHead(201, { "content-type": "application/json" });
        res.end(JSON.stringify(issue));
      });
      return;
    }
    res.writeHead(404);
    res.end();
  });
  return new Promise<FakeGitHub>(resolve => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address() as any;
      resolve({
        baseUrl: `http://127.0.0.1:${address.port}`,
        server,
        issues,
        get postCalls() { return postCalls; }
      });
    });
  });
}

test("GitHub pack reads live-shaped repository state and independently verifies it", async () => {
  const fake = await startFakeGitHub();
  try {
    const store = new WorkStore();
    const registry = new CapabilityRegistry();
    const verification = new VerificationEngine();
    registerGitHubPack(registry, verification);
    const work = store.create({
      objective: "Read a repository",
      inputs: { repository: "acme/demo", apiBaseUrl: fake.baseUrl },
      constraints: { defaultBranch: "main" },
      success: [{ id: "repo", description: "Repository is on main", verifier: "pack.github.repo.read", required: true }],
      deliverables: [],
      riskClass: "read"
    });
    const engine = new WorkEngine(store, registry, verification, async () => false);
    await engine.run(work, [{
      id: "read",
      operation: "get_repo",
      capability: "pack.github.repo.read",
      input: { repository: "acme/demo", apiBaseUrl: fake.baseUrl },
      idempotencyKey: "github:read:acme/demo",
      riskClass: "read"
    }]);
    assert.equal(work.status, "verified");
    assert.ok(work.artifacts.some((a: any) => a.kind === "github-repository-verification"));
  } finally {
    await new Promise<void>(resolve => fake.server.close(() => resolve()));
  }
});

test("GitHub external write survives lost acknowledgement with one POST and approval enforcement", async () => {
  const fake = await startFakeGitHub({ loseCreateAck: true });
  try {
    const store = new WorkStore();
    const registry = new CapabilityRegistry();
    const verification = new VerificationEngine();
    registerGitHubPack(registry, verification);
    const input = {
      repository: "acme/demo",
      title: "WorkProof acceptance issue",
      body: "Created for deterministic local integration testing.",
      idempotencyMarker: "test-issue-001",
      apiBaseUrl: fake.baseUrl
    };
    const work = store.create({
      objective: "Create exactly one GitHub issue and prove it exists",
      inputs: input,
      success: [{ id: "issue", description: "The issue exists with the expected content", verifier: "pack.github.issue.create", required: true }],
      deliverables: ["GitHub issue"],
      riskClass: "external_write",
      approvalRequired: true
    });
    const blockedEngine = new WorkEngine(store, registry, verification, async () => false, {
      maxRisk: "external_write",
      approvalRequiredAbove: "external_write",
      approved: false
    });
    await blockedEngine.run(work, [{
      id: "create",
      operation: "create_issue",
      capability: "pack.github.issue.create",
      input,
      idempotencyKey: "github:issue:acme/demo:test-issue-001",
      riskClass: "external_write"
    }]);
    assert.equal(work.status, "failed");
    assert.equal(fake.postCalls, 0);

    const approvedStore = new WorkStore();
    const approvedRegistry = new CapabilityRegistry();
    const approvedVerification = new VerificationEngine();
    registerGitHubPack(approvedRegistry, approvedVerification);
    const approvedWork = approvedStore.create({
      objective: work.contract.objective,
      inputs: input,
      success: work.contract.success,
      deliverables: work.contract.deliverables,
      riskClass: "external_write",
      approvalRequired: true
    });
    const approvedEngine = new WorkEngine(
      approvedStore,
      approvedRegistry,
      approvedVerification,
      async (_w: any, effectId: string) => {
        const found = await findGitHubIssueByMarker(input);
        if (!found) return false;
        const effect = approvedWork.effects.find((e: any) => e.effectId === effectId);
        if (effect) effect.lastObservedState = { number: found.number, title: found.title };
        return true;
      },
      { maxRisk: "external_write", approvalRequiredAbove: "external_write", approved: true }
    );
    await approvedEngine.run(approvedWork, [{
      id: "create",
      operation: "create_issue",
      capability: "pack.github.issue.create",
      input,
      idempotencyKey: "github:issue:acme/demo:test-issue-001",
      riskClass: "external_write"
    }]);
    assert.equal(approvedWork.status, "verified");
    assert.equal(fake.postCalls, 1);
    assert.equal(approvedWork.effects[0].status, "verified");
    assert.ok(approvedWork.events.some((e: any) => e.type === "recovery.reconcile"));
    assert.ok(approvedWork.artifacts.some((a: any) => a.kind === "github-issue-state"));
  } finally {
    await new Promise<void>(resolve => fake.server.close(() => resolve()));
  }
});

test("GitHub pack manifest, effect operation context, and proof integrity are enforced", async () => {
  const manifest = JSON.parse(fs.readFileSync("docs/packs/github-pack.json", "utf8"));
  assert.equal(manifest.$schema, "../schemas/pack.schema.json");
  assert.deepEqual(manifest.capabilities, [
    "pack.github.repo.read@0.1.0",
    "pack.github.issue.create@0.1.0"
  ]);
  assert.deepEqual(manifest.verifiers, [
    "pack.github.repo.read",
    "pack.github.issue.create"
  ]);

  const store = new WorkStore();
  const work = store.create({ objective: "integrity", success: [], deliverables: [], riskClass: "read" });
  const effect = store.addEffect(work, "pack.github.issue.create", "external_write", "k", "create_issue");
  assert.equal(effect.operation, "create_issue");

  const bundle = buildProofBundle(work);
  const manifestDigest = buildIntegrityManifest(work);
  assert.equal(verifyProofIntegrity(bundle, manifestDigest), true);
  const tampered = { ...bundle, work: { ...(bundle.work as any), status: "failed" } };
  assert.equal(verifyProofIntegrity(tampered, manifestDigest), false);
  assert.equal(canonicalJson({ b: 2, a: 1 }), canonicalJson({ a: 1, b: 2 }));
});

export {};