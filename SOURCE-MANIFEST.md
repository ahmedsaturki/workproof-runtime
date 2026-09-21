# WorkProof Runtime Source Manifest

## Required source tree

The verified main v0.5-dev source tree contains **59 required paths** enforced by scripts/verify-source-tree.js.

V0.5 additions include:
- docs/FINAL-AUDIT-V0.5.md
- docs/packs/github-pack.json
- docs/RELEASE-GATE-V0.5.md
- packages/evidence/src/integrity.ts
- test/github.test.ts
- test/two-system.test.ts

## v0.4 local exact history

- local commit: 8cd9b7d841191b8a030bb462ac8dbd271f8259ca
- tag: v0.4.0-dev
- exact development bundle: workproof-runtime-v0.4.0-dev.bundle

## Verified main

- commit: d9af0d9358e3ceae4468bdf546f1990353feb7bb
- CI run: #34
- result: source audit + strict build + 28/28 tests + benchmark + demo + CLI + live GitHub read smoke all passed

## Verification discipline

Path completeness, compilation, tests, benchmark, live smoke, and acceptance behavior are separate gates. Passing one does not imply the others passed.
