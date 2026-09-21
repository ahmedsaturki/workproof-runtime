import { CapabilityRegistry } from "../../capabilities/src/registry";
import { Capability, CapabilityReceipt, EvidenceRef, Verifier } from "../../core/src/types";
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

export interface GitLocalChangeInput {
  repoPath: string;
  remotePath: string;
  branch: string;
  filePath: string;
  content: string;
  commitMessage: string;
  remoteName?: string;
}

const MAX_PATH = 4096;
const MAX_BRANCH = 128;
const MAX_FILE_PATH = 512;
const MAX_CONTENT_BYTES = 1024 * 1024;
const MAX_COMMIT_MESSAGE_BYTES = 4096;
const SAFE_REF = /^[A-Za-z0-9._/-]+$/;

function validPath(value: unknown, max = MAX_PATH): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max;
}

function validRef(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_BRANCH && SAFE_REF.test(value) && !value.includes("..");
}

function validRelativeFilePath(value: unknown): value is string {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_FILE_PATH &&
    !value.startsWith("/") &&
    !value.startsWith("\\") &&
    !value.includes("\\") &&
    !value.split("/").includes("..") &&
    SAFE_REF.test(value);
}

function runGit(repoPath: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: repoPath,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function runGitDir(gitDir: string, args: string[]): string {
  return execFileSync("git", ["--git-dir", gitDir, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function showGitFile(gitDir: string, refAndPath: string): string {
  return execFileSync("git", ["--git-dir", gitDir, "show", refAndPath], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function validate(input: GitLocalChangeInput): void {
  if (!validPath(input.repoPath) || !fs.existsSync(path.resolve(input.repoPath))) throw new Error("repoPath is invalid");
  if (!validPath(input.remotePath) || !fs.existsSync(path.resolve(input.remotePath))) throw new Error("remotePath is invalid");
  if (!validRef(input.branch)) throw new Error("branch is invalid");
  if (!validRelativeFilePath(input.filePath)) throw new Error("filePath must be a safe relative path");
  if (typeof input.content !== "string" || Buffer.byteLength(input.content, "utf8") > MAX_CONTENT_BYTES) throw new Error("content exceeds maximum size");
  if (typeof input.commitMessage !== "string" || input.commitMessage.length === 0 || Buffer.byteLength(input.commitMessage, "utf8") > MAX_COMMIT_MESSAGE_BYTES || /[\r\n\x00]/.test(input.commitMessage)) {
    throw new Error("commitMessage must be a single bounded line");
  }
  if (input.remoteName !== undefined && !validRef(input.remoteName)) throw new Error("remoteName is invalid");
  const repoPath = path.resolve(input.repoPath);
  const remotePath = path.resolve(input.remotePath);
  if (runGit(repoPath, ["rev-parse", "--is-inside-work-tree"]) !== "true") throw new Error("repoPath is not a Git working tree");
  if (runGitDir(remotePath, ["rev-parse", "--is-bare-repository"]) !== "true") throw new Error("remotePath is not a bare Git repository");
}

function assertTargetWithinRepo(repoPath: string, target: string): void {
  const repoRoot = fs.realpathSync(path.resolve(repoPath));
  const lexicalTarget = path.resolve(target);
  if (!(lexicalTarget === repoRoot || lexicalTarget.startsWith(repoRoot + path.sep))) throw new Error("filePath escapes repository root");
  if (fs.existsSync(lexicalTarget)) {
    const realTarget = fs.realpathSync(lexicalTarget);
    if (!(realTarget === repoRoot || realTarget.startsWith(repoRoot + path.sep))) throw new Error("filePath resolves outside repository root");
    return;
  }
  let parent = path.dirname(lexicalTarget);
  while (parent !== path.dirname(parent) && !fs.existsSync(parent)) parent = path.dirname(parent);
  const realParent = fs.realpathSync(parent);
  if (!(realParent === repoRoot || realParent.startsWith(repoRoot + path.sep))) throw new Error("filePath parent resolves outside repository root");
}

function evidence(input: GitLocalChangeInput, kind: string, uri: string, metadata: Record<string, string | number | boolean>): EvidenceRef {
  return { id: "git-local:" + kind + ":" + path.resolve(input.repoPath) + ":" + input.filePath, kind, uri, observedAt: new Date().toISOString(), metadata };
}

class GitLocalChangeCapability implements Capability {
  name = "pack.git.local.change";
  version = "0.1.0";
  operations = ["update_commit_push"];
  riskClass = "local_write" as const;

  async execute(request: { operation: string; input: unknown }): Promise<CapabilityReceipt> {
    if (request.operation !== "update_commit_push") return { status: "rejected", data: { reason: "unsupported operation" } };
    const input = request.input as GitLocalChangeInput;
    try {
      validate(input);
      const repoPath = path.resolve(input.repoPath);
      const remotePath = path.resolve(input.remotePath);
      const remoteName = input.remoteName ?? "workproof-benchmark";
      const branch = input.branch;
      const target = path.resolve(repoPath, input.filePath);
      assertTargetWithinRepo(repoPath, target);

      const currentBranch = runGit(repoPath, ["symbolic-ref", "--short", "HEAD"]);
      if (currentBranch !== branch) throw new Error("working tree is on " + currentBranch + ", expected " + branch);

      const status = runGit(repoPath, ["status", "--porcelain"]);
      if (status) throw new Error("working tree must be clean before the bounded Git mutation");

      let existingRemote = "";
      try { existingRemote = runGit(repoPath, ["remote", "get-url", remoteName]); } catch {}
      if (existingRemote !== remotePath) {
        if (existingRemote) runGit(repoPath, ["remote", "set-url", remoteName, remotePath]);
        else runGit(repoPath, ["remote", "add", remoteName, remotePath]);
      }

      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, input.content, { encoding: "utf8" });
      runGit(repoPath, ["diff", "--check", "--", input.filePath]);
      runGit(repoPath, ["add", "--", input.filePath]);
      runGit(repoPath, ["diff", "--cached", "--check"]);
      runGit(repoPath, ["commit", "-m", input.commitMessage]);
      const commit = runGit(repoPath, ["rev-parse", "HEAD"]);
      runGit(repoPath, ["push", remoteName, branch + ":" + branch]);

      return {
        status: "accepted",
        data: { branch, filePath: input.filePath, commit, remoteName, validation: "git diff --check" },
        externalEffectId: "git-local:" + commit,
        evidence: [
          evidence(input, "git-commit", "git:" + commit, { commit, branch, filePath: input.filePath }),
          evidence(input, "git-push", remotePath, { remoteName, branch, commit })
        ]
      };
    } catch (error) {
      return { status: "rejected", data: { reason: String(error) } };
    }
  }
}

class GitLocalChangeVerifier implements Verifier {
  name = "pack.git.local.change";

  async verify(ctx: { work: any; criterion: any }) {
    const input = ctx.work.contract.inputs as GitLocalChangeInput;
    try {
      validate(input);
      const remotePath = path.resolve(input.remotePath);
      const remoteCommit = runGitDir(remotePath, ["rev-parse", input.branch]);
      const raw = showGitFile(remotePath, input.branch + ":" + input.filePath);
      const contentMatches = raw === input.content;
      const passed = contentMatches && /^[0-9a-f]{40}$/.test(remoteCommit);
      return {
        id: ctx.criterion.id,
        criterion: ctx.criterion.description,
        passed,
        details: "remoteCommit=" + remoteCommit + "; contentMatches=" + contentMatches,
        evidence: passed ? [evidence(input, "git-remote-verification", "git:" + remoteCommit, { branch: input.branch, commit: remoteCommit, filePath: input.filePath })] : []
      };
    } catch (error) {
      return { id: ctx.criterion.id, criterion: ctx.criterion.description, passed: false, details: String(error), evidence: [] };
    }
  }
}

export function registerGitLocalPack(
  registry: CapabilityRegistry,
  verification: { register(v: Verifier): void }
): void {
  registry.register(new GitLocalChangeCapability());
  verification.register(new GitLocalChangeVerifier());
}
