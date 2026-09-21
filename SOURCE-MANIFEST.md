# WorkProof Runtime Source Manifest

## Required source tree

The v0.8 trusted-proof-policy branch contains **67 required paths** enforced by scripts/verify-source-tree.js.

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

## v0.4 local exact history

- local commit: 8cd9b7d841191b8a030bb462ac8dbd271f8259ca
- tag: v0.4.0-dev
- exact development bundle: workproof-runtime-v0.4.0-dev.bundle

## Verified main

- commit: 5ea9aab16e7333621b639f7f96c0e5a4ad9852c8
- v0.7 merged-main repair CI is the current final gate
- v0.7 runtime gates previously passed on feature run #70 and merged-main run #71
- current main includes the deterministic signature-tamper regression fix; the new final CI run must pass before this state is treated as closed

## Verification discipline

Path completeness, compilation, tests, benchmark, live smoke, and acceptance behavior are separate gates. Passing one does not imply the others passed.
