# WorkProof Runtime Source Manifest

## Required source tree

The verified v2.9 main tree contains **143 required paths** enforced by scripts/verify-source-tree.js.

v2.9 additions include:
- docs/FINAL-AUDIT-V2.9.md
- docs/RELEASE-GATE-V2.9.md
- operational filtering additions in apps/studio.ts and test/studio.test.ts

## v0.4 local exact history

- local commit: 8cd9b7d841191b8a030bb462ac8dbd271f8259ca
- tag: v0.4.0-dev
- exact development bundle: workproof-runtime-v0.4.0-dev.bundle

## Verified main

- v2.9 main commit: b8be593242d19e3251914855801fc505aa19a566
- v2.9 merged-main CI: #751
- v2.8 final audit baseline: aed65c8ecf770efa7ae1d2c2aa2500133a5dbf81
- result: source audit + dependency security + CDP + strict build + retention + full suite + benchmark + demo + CLI + live GitHub smoke all passed

## Verification discipline

Path completeness, compilation, security, retention, integration behavior, benchmark, demo, live smoke, and release documentation are separate gates. Passing one does not imply the others passed.
