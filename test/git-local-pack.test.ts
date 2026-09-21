const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const { WorkStore } = require("../packages/core/src/work.js");
const { CapabilityRegistry } = require("../packages/capabilities/src/registry.js");
const { VerificationEngine } = require("../packages/verification/src/engine.js");
const { WorkEngine } = require("../packages/runtime/src/engine.js");
const { registerGitLocalPack } = require("../packages/packs/src/git-local-pack.js");

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function setupGit() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "workproof-git-pack-"));
  const remote = path.join(root, "remote.git");
  const repo = path.join(root, "repo");
  fs.mkdirSync(repo);
  git(root, ["init", "--bare", remote]);
  git(repo, ["init", "-b", "main"]);
  git(repo, ["config", "user.name", "WorkProof Test"]);
  git(repo, ["config", "user.email", "test@workproof.local"]);
  fs.writeFileSync(path.join(repo, "README.md"), "baseline\n", "utf8");
  git(repo, ["add", "--", "README.md"]);
  git(repo, ["commit", "-m", "baseline"]);
  return { root, remote, repo };
}

test("local git capability commits, pushes, and independently verifies remote state", async () => {
  const f = setupGit();
  try {
    const store = new WorkStore();
    const registry = new CapabilityRegistry();
    const verification = new VerificationEngine();
    registerGitLocalPack(registry, verification);
    const input = { repoPath: f.repo, remotePath: f.remote, branch: "main", filePath: "verified.txt", content: "verified\n", commitMessage: "test: verified git change" };
    const work = store.create({
      objective: "Verify Git change",
      inputs: input,
      success: [{ id: "remote", description: "Remote contains verified file", verifier: "pack.git.local.change", required: true }],
      deliverables: ["remote commit"],
      riskClass: "local_write"
    });
    const engine = new WorkEngine(store, registry, verification, async () => false);
    await engine.run(work, [{
      id: "git",
      operation: "update_commit_push",
      capability: "pack.git.local.change",
      input,
      idempotencyKey: "test:git:verified",
      riskClass: "local_write"
    }]);
    assert.equal(work.status, "verified");
    assert.equal(fs.readFileSync(path.join(f.repo, "verified.txt"), "utf8"), "verified\n");
    assert.equal(git(f.remote, ["show", "main:verified.txt"]), "verified");
    assert.equal(work.effects[0].status, "acknowledged");
    assert.ok(work.artifacts.some((a: any) => a.kind === "git-remote-verification"));
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

test("local git capability rejects unsafe file paths and unsupported operations without shell execution", async () => {
  const f = setupGit();
  try {
    const registry = new CapabilityRegistry();
    const verification = new VerificationEngine();
    registerGitLocalPack(registry, verification);
    const capability = registry.get("pack.git.local.change");
    const base = { repoPath: f.repo, remotePath: f.remote, branch: "main", filePath: "safe.txt", content: "ok; touch PWNED", commitMessage: "safe" };
    const invalid = await capability.execute({ operation: "update_commit_push", input: { ...base, filePath: "../escape.txt" } }, { work: {}, effect: undefined, log: () => {} });
    const unsupported = await capability.execute({ operation: "run_shell", input: base }, { work: {}, effect: undefined, log: () => {} });
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "workproof-git-outside-"));
    fs.symlinkSync(outside, path.join(f.repo, "linked-dir"), "dir");
    const symlinkEscape = await capability.execute({
      operation: "update_commit_push",
      input: { ...base, filePath: "linked-dir/escaped.txt", content: "must not escape" }
    }, { work: {}, effect: undefined, log: () => {} });
    const literal = await capability.execute({ operation: "update_commit_push", input: base }, { work: {}, effect: undefined, log: () => {} });
    assert.equal(invalid.status, "rejected");
    assert.equal(symlinkEscape.status, "rejected");
    assert.equal(fs.existsSync(path.join(outside, "escaped.txt")), false);
    assert.equal(unsupported.status, "rejected");
    assert.equal(literal.status, "accepted");
    assert.equal(fs.existsSync(path.join(f.repo, "PWNED")), false);
    assert.equal(git(f.remote, ["show", "main:safe.txt"]), "ok; touch PWNED");
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

export {};
