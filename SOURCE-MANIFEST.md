# WorkProof Runtime Source Manifest

## Required source tree

The v0.9 proof-vault branch contains **71 required paths** enforced by scripts/verify-source-tree.js.

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

## v0.4 local exact history

- local commit: 8cd9b7d841191b8a030bb462ac8dbd271f8259ca
- tag: v0.4.0-dev
- exact development bundle: workproof-runtime-v0.4.0-dev.bundle

## Verified main

- commit: 5ea9aab16e7333621b639f7f96c0e5a4ad9852c8
- v0.7 merged-main CI run #82: success
- result: source audit + build + 33 tests + benchmark/demo/CLI + browser/HTTP/publication/recovery paths + live GitHub read smoke passed
- active branch extends the verified v0.7 state with local trust and proof-vault work

## Verification discipline

Path completeness, compilation, tests, benchmark, live smoke, and acceptance behavior are separate gates. Passing one does not imply the others passed.
