import { CapabilityRegistry } from "../../capabilities/src/registry";
import { Capability, CapabilityReceipt, EvidenceRef, Verifier } from "../../core/src/types";

export interface GitHubRepoInput {
  repository: string;
  apiBaseUrl?: string;
}

export interface GitHubIssueInput {
  repository: string;
  title: string;
  body?: string;
  idempotencyMarker: string;
  apiBaseUrl?: string;
  labels?: string[];
  assignees?: string[];
}

type GitHubIssue = {
  number: number;
  title: string;
  body: string | null;
  html_url?: string;
  state?: string;
  repository_url?: string;
};

function apiBase(input: { apiBaseUrl?: string }): string {
  const base = input.apiBaseUrl ?? process.env.GITHUB_API_URL ?? "https://api.github.com";
  const parsed = new URL(base);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("GitHub API base must use http or https");
  return parsed.toString().replace(/\/$/, "");
}

function validRepository(repository: string): boolean {
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository);
}

function validIdempotencyMarker(marker: string): boolean {
  return /^[A-Za-z0-9._:-]{1,128}$/.test(marker);
}

function apiUrl(input: GitHubRepoInput): string {
  return `${apiBase(input)}/repos/${input.repository}`;
}

function issuesUrl(input: { repository: string; apiBaseUrl?: string }): string {
  return `${apiBase(input)}/repos/${input.repository}/issues?state=all&per_page=100`;
}

function headers(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

function markerText(marker: string): string {
  return `<!-- workproof:idempotency:${marker} -->`;
}

function issueEvidence(repository: string, issue: GitHubIssue): EvidenceRef {
  return {
    id: `github:issue:${repository}:${issue.number}`,
    kind: "github-issue-state",
    uri: issue.html_url,
    observedAt: new Date().toISOString(),
    metadata: {
      repository,
      number: issue.number,
      title: issue.title,
      state: issue.state ?? "unknown"
    }
  };
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  try { return JSON.parse(text); } catch { return { raw: text.slice(0, 2000) }; }
}

export async function findGitHubIssueByMarker(input: GitHubIssueInput): Promise<GitHubIssue | null> {
  const marker = markerText(input.idempotencyMarker);
  for (let page = 1; ; page += 1) {
    const separator = issuesUrl(input).includes("?") ? "&" : "?";
    const response = await fetch(
      issuesUrl(input) + separator + "page=" + page,
      { headers: headers() }
    );
    if (!response.ok) throw new Error(`GitHub issue list HTTP ${response.status}`);
    const data = await readJson(response);
    if (!Array.isArray(data)) throw new Error("GitHub issue list response was not an array");
    const found = (data as unknown[]).find(value => {
      const issue = value as Record<string, unknown>;
      if (issue.pull_request) return false;
      return String(issue.body ?? "").includes(marker);
    }) as GitHubIssue | undefined;
    if (found) return found;
    if (data.length < 100) return null;
  }
}

class GitHubRepositoryReadCapability implements Capability {
  name = "pack.github.repo.read";
  version = "0.1.0";
  operations = ["get_repo"];
  riskClass = "read" as const;

  async execute(request: { operation: string; input: unknown }): Promise<CapabilityReceipt> {
    const input = request.input as GitHubRepoInput;
    if (!input?.repository || !validRepository(input.repository)) {
      return { status: "rejected", data: { reason: "repository must be an owner/repository identifier" } };
    }

    try {
      const response = await fetch(apiUrl(input), { headers: headers() });
      const data = await readJson(response);

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

class GitHubIssueCreateCapability implements Capability {
  name = "pack.github.issue.create";
  version = "0.1.0";
  operations = ["create_issue"];
  riskClass = "external_write" as const;

  async execute(request: { operation: string; input: unknown }, ctx: { work: any; effect?: any; log: any }): Promise<CapabilityReceipt> {
    const input = request.input as GitHubIssueInput;
    if (!input?.repository || !validRepository(input.repository) || !input?.title) {
      return { status: "rejected", data: { reason: "repository must be an owner/repository identifier and title is required" } };
    }
    if (!input.idempotencyMarker || !validIdempotencyMarker(input.idempotencyMarker)) {
      return { status: "rejected", data: { reason: "idempotencyMarker must match [A-Za-z0-9._:-]{1,128}" } };
    }

    try {
      const existing = await findGitHubIssueByMarker(input);
      if (existing) {
        ctx.log("effect.reconciled", "Existing GitHub issue matched the idempotency marker before write", {
          effectId: String(ctx.effect?.effectId ?? ""),
          externalEffectId: `github:issue:${existing.number}`
        });
        return {
          status: "accepted",
          data: existing,
          externalEffectId: `github:issue:${input.repository}#${existing.number}`,
          evidence: [issueEvidence(input.repository, existing)]
        };
      }

      const body = input.body ? `${input.body}\n\n${markerText(input.idempotencyMarker)}` : markerText(input.idempotencyMarker);
      const response = await fetch(`${apiBase(input)}/repos/${input.repository}/issues`, {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({
          title: input.title,
          body,
          ...(input.labels?.length ? { labels: input.labels } : {}),
          ...(input.assignees?.length ? { assignees: input.assignees } : {})
        })
      });
      const data = await readJson(response);
      if (!response.ok) {
        return {
          status: "ambiguous",
          data: {
            reason: "GitHub issue write did not return a successful acknowledgement; reconciliation is required before retry",
            status: response.status,
            response: data
          }
        };
      }
      const issue = data as GitHubIssue;
      if (!Number.isFinite(issue.number)) {
        return {
          status: "ambiguous",
          data: {
            reason: "GitHub issue write returned an incomplete acknowledgement; reconciliation is required before retry",
            response: data
          }
        };
      }
      return {
        status: "accepted",
        data: issue,
        externalEffectId: `github:issue:${input.repository}#${issue.number}`,
        evidence: [issueEvidence(input.repository, issue)]
      };
    } catch (error) {
      return { status: "ambiguous", data: { error: String(error) } };
    }
  }
}

class GitHubIssueCreateVerifier implements Verifier {
  name = "pack.github.issue.create";

  async verify(ctx: {
    work: any;
    criterion: any;
    artifacts: EvidenceRef[];
  }) {
    const input = ctx.work.contract.inputs as GitHubIssueInput;
    try {
      if (!input?.repository || !validRepository(input.repository) || !input?.title || !validIdempotencyMarker(input.idempotencyMarker)) {
        return {
          id: ctx.criterion.id,
          criterion: ctx.criterion.description,
          passed: false,
          details: "Verifier requires repository, title, and idempotencyMarker in the work contract inputs",
          evidence: []
        };
      }
      const issue = await findGitHubIssueByMarker(input);
      if (!issue) {
        return {
          id: ctx.criterion.id,
          criterion: ctx.criterion.description,
          passed: false,
          details: "No GitHub issue matched the idempotency marker",
          evidence: []
        };
      }
      const marker = markerText(input.idempotencyMarker);
      const expectedBody = input.body?.trim() ?? "";
      const actualBody = String(issue.body ?? "").replace(marker, "").trim();
      const titleMatches = issue.title === input.title;
      const bodyMatches = !input.body || actualBody === expectedBody;
      const repositoryMatches = String((issue.repository_url ?? "")).endsWith(`/repos/${input.repository}`) || Boolean(issue.html_url?.includes(`github.com/${input.repository}/issues/`));
      const passed = titleMatches && bodyMatches && repositoryMatches;

      return {
        id: ctx.criterion.id,
        criterion: ctx.criterion.description,
        passed,
        details: `title=${titleMatches}; body=${bodyMatches}; repository=${repositoryMatches}; issue=${issue.number}`,
        evidence: passed ? [issueEvidence(input.repository, issue)] : []
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
  registry.register(new GitHubIssueCreateCapability());
  verification.register(new GitHubRepositoryVerifier());
  verification.register(new GitHubIssueCreateVerifier());
}
