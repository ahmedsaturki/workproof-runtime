# WorkProof Runtime Source Manifest

## Required source tree

The verified development source tree contains 53 required paths. The remote CI enforces their presence through scripts/verify-source-tree.js.

## Local exact history

- commit: 8cd9b7d841191b8a030bb462ac8dbd271f8259ca
- tag: v0.4.0-dev
- exact Git bundle: workproof-runtime-v0.4.0-dev.bundle

## Remote state

All 53 required paths are present on the current main branch. The remote history is a reconstructed sequence of verified commits, not a byte-identical copy of the local Git object database.

## Verification

GitHub Actions run 12 passed:
- source-tree audit
- TypeScript build
- 22/22 tests
- benchmark
- demo
- CLI proof verification and mission execution

This manifest distinguishes path completeness from Git-object byte parity intentionally.
