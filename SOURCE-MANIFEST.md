# WorkProof Runtime Source Manifest

## Required source tree

The active v2.9 operational-filtering branch contains **142 required paths** enforced by scripts/verify-source-tree.js.

v2.9 additions include:
- docs/RELEASE-GATE-V2.9.md
- Operational filtering additions in apps/studio.ts and test/studio.test.ts

v2.8 additions include:
- docs/FINAL-AUDIT-V2.8.md
- docs/RELEASE-GATE-V2.8.md
- test/lease-visibility.test.ts

The v2.8 finalization also includes PersistentLeaseStore parity for the same LeaseStatus projection.

## v0.4 local exact history

- local commit: 8cd9b7d841191b8a030bb462ac8dbd271f8259ca
- tag: v0.4.0-dev
- exact development bundle: workproof-runtime-v0.4.0-dev.bundle

## Verified main

- final v2.8 main commit before documentation closeout: aed65c8ecf770efa7ae1d2c2aa2500133a5dbf81
- initial v2.8 implementation merge: 44ed49dac589389bdad9bbcb6e177a74f43767f9
- finalization PR: #60
- finalization feature CI: #726
- finalization PR CI: #727
- finalization merged-main CI: #728
- result: source audit + dependency security + CDP + strict build + retention + full suite + benchmark + demo + CLI + live GitHub smoke all passed

## Verification discipline

Path completeness, compilation, security, retention, integration behavior, benchmark, demo, live smoke, and release documentation are separate gates. Passing one does not imply the others passed.
