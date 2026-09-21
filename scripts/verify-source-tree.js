const fs = require("fs");
const path = require("path");

const required = [
  ".github/workflows/ci.yml",
  ".gitignore",
  "ARCHITECTURE.md",
  "LICENSE",
  "README.md",
  "SPEC.md",
  "apps/benchmark.ts",
  "apps/demo.ts",
  "docs/BENCHMARK-V1.md",
  "docs/BENCHMARK-V2.md",
  "docs/DIRECTION-V8-EXPERT-REVIEW-2026-09-21.md",
  "docs/ECOSYSTEM-ARCHITECTURE-V1.md",
  "docs/ECOSYSTEM-ROADMAP-V2.md",
  "docs/EXTENSION-CONTRACT.md",
  "docs/FINAL-AUDIT-V0.4.md",
  "docs/FINAL-AUDIT-V0.5.md",
  "docs/OPERATING-MODEL.md",
  "docs/PRODUCT-DIRECTION-V10.md",
  "docs/PRODUCT-DIRECTION-V9.md",
  "docs/RELEASE-GATE-V0.2.md",
  "docs/RELEASE-GATE-V0.3.md",
  "docs/RELEASE-GATE-V0.4.md",
  "docs/RELEASE-GATE-V0.5.md",
  "docs/REPO-BOOTSTRAP.md",
  "docs/SPEC-V0.4.md",
  "docs/packs/github-pack.json",
  "docs/schemas/pack.schema.json",
  "docs/schemas/work-object.schema.json",
  "examples/missions/research-local.json",
  "lab/data/suppliers.json",
  "lab/fixtures/research-pack.json",
  "package.json",
  "packages/capabilities/src/registry.ts",
  "packages/cli/src/index.ts",
  "packages/core/src/types.ts",
  "packages/core/src/work.ts",
  "packages/evidence/src/bundle.ts",
  "packages/evidence/src/integrity.ts",
  "packages/packs/src/browser-local-pack.ts",
  "packages/packs/src/github-pack.ts",
  "packages/packs/src/local-pack.ts",
  "packages/packs/src/publication-pack.ts",
  "packages/packs/src/research-pack.ts",
  "packages/packs/src/web-discovery-pack.ts",
  "packages/policy/src/guard.ts",
  "packages/recovery/src/engine.ts",
  "packages/runtime/src/engine.ts",
  "packages/runtime/src/router.ts",
  "packages/storage/src/json.ts",
  "packages/verification/src/engine.ts",
  "test/browser.test.ts",
  "test/discovery.test.ts",
  "test/external.test.ts",
  "test/cli-integrity.test.ts",
  "test/github.test.ts",
  "test/kernel.test.ts",
  "test/publication.test.ts",
  "test/runtime.test.ts",
  "test/two-system.test.ts",
  "tsconfig.json",
  "types/globals.d.ts"
];

const missing = required.filter((p) => !fs.existsSync(path.resolve(p)));
if (missing.length) {
  console.error("Missing required source files:");
  console.error(missing.join("\n"));
  process.exit(1);
}

console.log(JSON.stringify({ requiredFiles: required.length, missing: 0, status: "verified" }));
