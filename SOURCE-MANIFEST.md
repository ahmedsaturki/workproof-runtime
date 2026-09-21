# WorkProof Runtime Source Manifest

## Required source tree

The v1.3 retention/GC branch contains **93 required paths** enforced by scripts/verify-source-tree.js.

V1.2 additions include:

V1.3 additions include:
- docs/RELEASE-GATE-V1.3.md
- packages/evidence/src/retention.ts
- test/retention.test.ts
- docs/RELEASE-GATE-V1.2.md
- docs/SECURITY-V1.2.md
- packages/evidence/src/trust-sync.ts
- packages/registry/src/trust-snapshots.ts
- test/trust-sync.test.ts
- test/trust-sync-registry.test.ts
- test/trust-sync-security.test.ts
- namespace-scoped signer trust regression coverage

## Main history

- v1.1 implementation verification commit: 7eeefa13afa56acb9db5038ec3b5885f0724e46f
- v1.2 merge commit: b6ef830d79dc432314a4da0f6e143ddb3a8b6f61
- v1.2 feature CI: run #298
- v1.2 merged-main CI: run #299
- result: source audit + dependency audit + 77/77 tests + benchmark/demo/CLI + live GitHub smoke all passed.

## Verification discipline

Path completeness, compilation, tests, benchmark, live smoke, and acceptance behavior are separate gates. Passing one does not imply the others passed.
