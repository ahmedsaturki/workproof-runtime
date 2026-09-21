const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const sourceTree = fs.readFileSync(path.resolve("scripts/verify-source-tree.js"), "utf8");
const testSources = [...sourceTree.matchAll(/"test\/[^"]+\.test\.ts"/g)]
  .map((match) => match[0].slice(1, -1))
  .sort();

if (!testSources.length) {
  console.error("No test files declared in scripts/verify-source-tree.js");
  process.exit(1);
}

const timeoutMs = Number(process.env.WORKPROOF_TEST_TIMEOUT_MS ?? 90000);
let passed = 0;

for (const source of testSources) {
  const compiled = path.resolve(source.replace(/^/, "dist/").replace(/\.ts$/, ".js"));
  process.stdout.write(`\n=== ${source} ===\n`);
  const result = spawnSync(process.execPath, ["--test", compiled], {
    cwd: process.cwd(),
    stdio: "inherit",
    timeout: timeoutMs
  });

  if (result.error) {
    if (result.error.code === "ETIMEDOUT") {
      console.error(`TIMEOUT: ${source} exceeded ${timeoutMs}ms`);
      process.exit(124);
    }
    console.error(`PROCESS_ERROR: ${source}: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`FAIL: ${source} exited with status ${result.status}`);
    process.exit(result.status ?? 1);
  }

  passed += 1;
}

console.log(`\nSequential test-file verification passed: ${passed}/${testSources.length}`);
