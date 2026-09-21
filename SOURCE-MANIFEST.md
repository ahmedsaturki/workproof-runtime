# WorkProof Runtime Source Manifest

## Required source tree

The v0.7 signed-proof source tree contains **64 required paths** enforced by scripts/verify-source-tree.js.

V0.6 additions:
- docs/RELEASE-GATE-V0.6.md
- test/cli-integrity.test.ts

V0.7 additions:
- docs/RELEASE-GATE-V0.7.md
- packages/evidence/src/signature.ts
- test/signature.test.ts

## v0.4 local exact history

- local commit: 8cd9b7d841191b8a030bb462ac8dbd271f8259ca
- tag: v0.4.0-dev
- exact development bundle: workproof-runtime-v0.4.0-dev.bundle

## Verified main

- commit: e4f3711861e31cec3fff923be3fbba045d3487f5
- v0.7 feature CI run: #70
- v0.7 merged-main CI run: #71
- result: source audit + strict build + 33/33 tests + benchmark + demo + CLI + browser/HTTP/publication/recovery paths + live GitHub read smoke all passed
- current `main` HEAD is documentation-only finalization on top of the verified runtime commit

## Verification discipline

Path completeness, compilation, tests, benchmark, live smoke, and acceptance behavior are separate gates. Passing one does not imply the others passed.
