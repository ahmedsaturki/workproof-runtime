# WorkProof Runtime Source Manifest

## Required source tree

The v1.2 trust-synchronization branch contains **90 required paths** enforced by scripts/verify-source-tree.js.

V1.2 additions include:
- docs/RELEASE-GATE-V1.2.md
- docs/SECURITY-V1.2.md
- packages/evidence/src/trust-sync.ts
- packages/registry/src/trust-snapshots.ts
- test/trust-sync.test.ts
- test/trust-sync-registry.test.ts
- test/trust-sync-security.test.ts
- expanded namespace-scoped registry security coverage

## Main history

- v1.1 implementation verification commit: 7eeefa13afa56acb9db5038ec3b5885f0724e46f
- current main documentation head: ce08fd74a7c86e8b37b59f925ceb605b34679ddf
- v1.1 feature gate: source audit + dependency audit + build/test + benchmark/demo/CLI + live GitHub smoke passed.
- subsequent main documentation synchronization also passed CI.

## Verification discipline

Path completeness, compilation, tests, benchmark, live smoke, and acceptance behavior are separate gates. Passing one does not imply the others passed.
