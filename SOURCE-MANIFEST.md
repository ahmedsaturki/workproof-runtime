# WorkProof Runtime Source Manifest

## Required source tree

The verified v3.0 main tree contains **145 required paths** enforced by scripts/verify-source-tree.js.

V3.0 additions include:
- docs/RELEASE-GATE-V3.0.md
- docs/FINAL-AUDIT-V3.0.md
- operational health projection additions in apps/studio.ts and test/studio.test.ts

V2.9 additions include:
- docs/FINAL-AUDIT-V2.9.md
- docs/RELEASE-GATE-V2.9.md
- operational filtering additions in apps/studio.ts and test/studio.test.ts
- CI headless Chrome/D-Bus preflight hardening in .github/workflows/ci.yml

## v0.4 local exact history

- local commit: 8cd9b7d841191b8a030bb462ac8dbd271f8259ca
- tag: v0.4.0-dev
- exact development bundle: workproof-runtime-v0.4.0-dev.bundle

## Verified main

- v2.9 implementation merge commit: b8be593242d19e3251914855801fc505aa19a566
- CI preflight hardening merge commit: 437516fb39e6f8c7469fc4540a0cf85f5e950391
- v2.9 implementation CI: #751
- CI hardening PR: #63, CI #760
- final merged-main CI: #761
- result: source audit + dependency security + Chromium/CDP + strict build + retention + full suite + benchmark + demo + CLI + live GitHub smoke all passed

## Verification discipline

Path completeness, compilation, security, retention, integration behavior, benchmark, demo, live smoke, and release documentation are separate gates. Passing one does not imply the others passed.
