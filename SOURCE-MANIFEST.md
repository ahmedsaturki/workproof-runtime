# WorkProof Runtime Source Manifest

## Required source tree

The v0.5 development branch contains 57 required paths enforced by scripts/verify-source-tree.js.

The additional v0.5 paths include:
- docs/packs/github-pack.json
- docs/RELEASE-GATE-V0.5.md
- packages/evidence/src/integrity.ts
- test/github.test.ts

## v0.4 local exact history

- local commit: 8cd9b7d841191b8a030bb462ac8dbd271f8259ca
- tag: v0.4.0-dev
- exact development bundle: workproof-runtime-v0.4.0-dev.bundle

## Remote branches

- main: v0.4 verified baseline at e28aed00dd75e4633ec63429cde590dd49a44892
- feature/v0.5-github-integration: v0.5 integration work

Remote history was reconstructed from verified source content through GitHub commits; it is not byte-identical to the local Git object database.

## Verification discipline

Path completeness, compilation, tests, benchmark, live smoke, and acceptance behavior are separate gates. Passing one does not imply the others passed.
