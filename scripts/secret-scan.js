const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const SECRET_PATTERNS = [
  { name: "PEM private key", regex: /-----BEGIN(?: [A-Z0-9-]+)? PRIVATE KEY-----\r?\n[A-Za-z0-9+/]{40,}={0,2}\r?\n-----END(?: [A-Z0-9-]+)? PRIVATE KEY-----/ },
  { name: "GitHub token", regex: /\b(?:gh[pousr]|github_pat)_[A-Za-z0-9_]{20,}\b/ },
  { name: "Slack token", regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { name: "AWS access key", regex: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "Google API key", regex: /\bAIza[0-9A-Za-z_-]{20,}\b/ },
  { name: "npm token", regex: /\bnpm_[A-Za-z0-9]{20,}\b/ },
  { name: "npm auth token", regex: /(?:^|\n)\s*(?:_authToken|NPM_TOKEN)\s*[=:]\s*["']?[^\s"']{20,}/i }
];

function trackedFiles() {
  const result = spawnSync("git", ["ls-files", "-z"], { encoding: "buffer" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("git ls-files failed: " + String(result.stderr || ""));
  return result.stdout.toString("utf8").split("\0").filter(Boolean);
}

function isBinary(buffer) {
  return buffer.includes(0);
}

function scanFile(relativePath) {
  const absolutePath = path.resolve(relativePath);
  if (!fs.existsSync(absolutePath)) return [];
  const buffer = fs.readFileSync(absolutePath);
  if (isBinary(buffer)) return [];
  const content = buffer.toString("utf8");
  const findings = [];
  for (const pattern of SECRET_PATTERNS) {
    const match = content.match(pattern.regex);
    if (!match) continue;
    const line = content.slice(0, match.index ?? 0).split("\n").length;
    findings.push({ relativePath, line, type: pattern.name });
  }
  return findings;
}

function scanTrackedFiles() {
  const findings = [];
  for (const file of trackedFiles()) findings.push(...scanFile(file));
  return findings;
}

function main() {
  const findings = scanTrackedFiles();
  if (findings.length) {
    for (const finding of findings) {
      process.stderr.write("Potential secret: " + finding.type + " at " + finding.relativePath + ":" + finding.line + "\n");
    }
    process.exitCode = 1;
    return;
  }
  process.stdout.write("Secret scan passed: no known credential patterns found in tracked text files.\n");
}

if (require.main === module) main();

module.exports = { SECRET_PATTERNS, scanTrackedFiles, scanFile };
