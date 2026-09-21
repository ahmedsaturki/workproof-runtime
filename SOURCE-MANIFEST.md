# WorkProof Runtime Source Manifest

## Required source tree

The v1.0 self-hosted registry branch contains **74 required paths** enforced by scripts/verify-source-tree.js.

V0.6 additions:
- docs/RELEASE-GATE-V0.6.md
- test/cli-integrity.test.ts

V0.7 additions:
- docs/RELEASE-GATE-V0.7.md
- packages/evidence/src/signature.ts
- test/signature.test.ts

V0.8 additions:
- docs/RELEASE-GATE-V0.8.md
- packages/evidence/src/trust.ts
- test/trust.test.ts
- test/trust-cli.test.ts

V0.9 additions:
- packages/evidence/src/vault.ts
- test/vault.test.ts
- test/vault-cli.test.ts

V1.0 additions:
- apps/registry-server.ts
- docs/RELEASE-GATE-V1.0.md
- packages/registry/src/http.ts
- test/registry.test.ts

## v0.4 local exact history

- local commit: 8cd9b7d841191b8a030bb462ac8dbd271f8259ca
- tag: v0.4.0-dev
- exact development bundle: workproof-runtime-v0.4.0-dev.bundle

## Verified main

- commit: 1b025eb8da677fb6e4ac84875103f5f76dc1a137
- v0.9 merged-main CI run #140: success
- result: source audit + build + 49 tests + benchmark/demo/CLI + browser/HTTP/publication/recovery paths + live GitHub read smoke passed
- active v1.0 branch extends the verified v0.9 state with self-hosted registry transport

## Verification discipline

Path completeness, compilation, tests, benchmark, live smoke, and acceptance behavior are separate gates. Passing one does not imply the others passed.
