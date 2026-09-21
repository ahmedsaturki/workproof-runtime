import { WorkStore } from "../packages/core/src/work";
import { CapabilityRegistry } from "../packages/capabilities/src/registry";
import { VerificationEngine } from "../packages/verification/src/engine";
import { WorkEngine } from "../packages/runtime/src/engine";
import { registerGitHubPack } from "../packages/packs/src/github-pack";

async function main(): Promise<void> {
  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository) throw new Error("GITHUB_REPOSITORY is required in the GitHub live smoke test");

  const store = new WorkStore();
  const registry = new CapabilityRegistry();
  const verification = new VerificationEngine();
  registerGitHubPack(registry, verification);

  const work = store.create({
    objective: `Read and independently verify GitHub repository ${repository}`,
    inputs: { repository },
    constraints: { defaultBranch: "main" },
    success: [{
      id: "repo-state",
      description: "The live GitHub repository exists and reports the expected default branch",
      verifier: "pack.github.repo.read",
      required: true
    }],
    deliverables: ["live GitHub repository state"],
    riskClass: "read"
  });

  const engine = new WorkEngine(
    store,
    registry,
    verification,
    async () => false
  );

  await engine.run(work, [{
    id: "read-repository",
    operation: "get_repo",
    capability: "pack.github.repo.read",
    input: { repository },
    idempotencyKey: `github:repo:read:${repository}`,
    riskClass: "read"
  }]);

  process.stdout.write(JSON.stringify({
    repository,
    status: work.status,
    verification: work.verification?.status,
    effects: work.effects.length,
    evidence: work.artifacts.length
  }, null, 2) + "\n");

  if (work.status !== "verified") process.exitCode = 2;
}

main().catch((error: Error) => {
  process.stderr.write(String(error) + "\n");
  process.exitCode = 1;
});

export {};
