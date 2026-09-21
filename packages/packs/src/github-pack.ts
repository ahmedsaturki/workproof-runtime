import { CapabilityRegistry } from "../../capabilities/src/registry";
import { Capability, CapabilityReceipt, EvidenceRef, Verifier } from "../../core/src/types";

export interface GitHubRepoInput {
  repository: string;
  apiBaseUrl?: string;
}

function apiUrl(input: GitHubRepoInput): string {
  const base = input.apiBaseUrl ?? process.env.GITHUB_API_URL ?? "https://api.github.com";
  return `${base.replace(/\/$/, "")}/repos/${input.repository}`;
}

function headers(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

class GitHubRepositoryReadCapability implements Capability {
  name = "pack.github.repo.read";
  version = "0.1.0";
  operations = ["get_repo"];
  riskClass = "read" as const;

  async execute(request: { operation: string; input: unknown }): Promise<CapabilityReceipt> {
    const input = request.input as GitHubRepoInput;
    if (!input?.repository) {
      return { status: "rejected", data: { reason: "repository is required" } };
    }

    try {
      const response = await fetch(apiUrl(input), { headers: headers() });
      const text = await response.text();
      let data: unknown;
      try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 2000) }; }

      if (!response.ok) {
        return { status: "rejected", data: { status: response.status, response: data } };
      }

      const repo = data as Record<string, unknown>;
      const evidence: EvidenceRef[] = [{
        id: `github:repo:${input.repository}`,
        kind: "github-repository-state",
        uri: apiUrl(input),
        observedAt: new Date().toISOString(),
        metadata: {
          full_name: String(repo.full_name ?? ""),
          default_branch: String(repo.default_branch ?? ""),
          private: Boolean(repo.private)
        }
      }];

      return {
        status: "accepted",
        data,
        evidence,
        externalEffectId: `github:read:${input.repository}`
      };
    } catch (error) {
      return { status: "ambiguous", data: { error: String(error) } };
    }
  }
}

class GitHubRepositoryVerifier implements Verifier {
  name = "pack.github.repo.read";

  async verify(ctx: {
    work: any;
    criterion: any;
    artifacts: EvidenceRef[];
  }) {
    const input = ctx.work.contract.inputs as GitHubRepoInput;
    try {
      const response = await fetch(apiUrl(input), { headers: headers() });
      if (!response.ok) {
        return {
          id: ctx.criterion.id,
          criterion: ctx.criterion.description,
          passed: false,
          details: `GitHub API HTTP ${response.status}`,
          evidence: []
        };
      }

      const repo = await response.json() as Record<string, unknown>;
      const fullNameMatches = String(repo.full_name ?? "").toLowerCase() === input.repository.toLowerCase();
      const branchMatches = ctx.work.contract.constraints?.defaultBranch
        ? String(repo.default_branch ?? "") === String(ctx.work.contract.constraints.defaultBranch)
        : true;
      const passed = fullNameMatches && branchMatches;

      return {
        id: ctx.criterion.id,
        criterion: ctx.criterion.description,
        passed,
        details: `full_name=${fullNameMatches}; default_branch=${branchMatches}`,
        evidence: passed
          ? [{
              id: `github:verified:${input.repository}`,
              kind: "github-repository-verification",
              uri: apiUrl(input),
              observedAt: new Date().toISOString()
            }]
          : []
      };
    } catch (error) {
      return {
        id: ctx.criterion.id,
        criterion: ctx.criterion.description,
        passed: false,
        details: String(error),
        evidence: []
      };
    }
  }
}

export function registerGitHubPack(
  registry: CapabilityRegistry,
  verification: { register(v: Verifier): void }
): void {
  registry.register(new GitHubRepositoryReadCapability());
  verification.register(new GitHubRepositoryVerifier());
}
