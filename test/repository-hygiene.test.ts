const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const { execFileSync } = require("child_process");

function trackedTextFiles() {
  const output = execFileSync("git", ["ls-files", "-z"], { encoding: "buffer" });
  return output.toString("utf8").split("\0").filter(Boolean);
}

test("repository text files contain no ChatGPT-only citation markers", () => {
  const start = "";
  const middle = "";
  const endMarker = "";
  const forbidden = [
    new RegExp(start + "cite" + middle),
    new RegExp(start + "filecite" + middle),
    new RegExp(start + "memcite" + endMarker),
    new RegExp(start + "url" + middle),
    new RegExp(start + "entity" + middle),
    new RegExp(start + "message_reaction" + middle)
  ];

  const findings = [];
  for (const file of trackedTextFiles()) {
    const data = fs.readFileSync(file);
    if (data.includes(0)) continue;
    const content = data.toString("utf8");
    for (const pattern of forbidden) {
      if (pattern.test(content)) findings.push(file + ": " + pattern);
    }
  }
  assert.deepStrictEqual(findings, [], "ChatGPT-only markers found:\n" + findings.join("\n"));
});
