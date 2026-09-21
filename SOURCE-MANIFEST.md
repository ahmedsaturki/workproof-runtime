# WorkProof Runtime Source Manifest

## Required source tree

The v0.6 proof-CLI branch contains **61 required paths** enforced by scripts/verify-source-tree.js.

V0.6 additions include:
- docs/RELEASE-GATE-V0.6.md
- test/cli-integrity.test.ts

## v0.4 local exact history

- local commit: 8cd9b7d841191b8a030bb462ac8dbd271f8259ca
- tag: v0.4.0-dev
- exact development bundle: workproof-runtime-v0.4.0-dev.bundle

## Verified main

- commit: d9af0d9358e3ceae4468bdf546f1990353feb7bb
- v0.5 CI run: #34 and final documentation CI run: #35
- result: source audit + strict build + 28/28 tests + benchmark + demo + CLI + live GitHub read smoke all passed

## Verification discipline

Path completeness, compilation, tests, benchmark, live smoke, and acceptance behavior are separate gates. Passing one does not imply the others passed.
