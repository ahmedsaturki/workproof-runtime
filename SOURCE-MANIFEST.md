# WorkProof Runtime Source Manifest

## Required source tree

The v2.8 finalization branch contains **140 required paths** enforced by scripts/verify-source-tree.js.

v2.8 additions include:
- docs/FINAL-AUDIT-V2.8.md
- docs/RELEASE-GATE-V2.8.md
- test/lease-visibility.test.ts

v2.8.1 hardening adds persistence parity for the same LeaseStatus projection contract.

## v0.4 local exact history

- local commit: 8cd9b7d841191b8a030bb462ac8dbd271f8259ca
- tag: v0.4.0-dev
- exact development bundle: workproof-runtime-v0.4.0-dev.bundle

## Verified main before finalization

- v2.8 implementation merge: 44ed49dac589389bdad9bbcb6e177a74f43767f9
- merged-main CI #710: success
- feature CI #708 and PR CI #709: success
- persistent lease visibility parity was identified as a post-merge hardening requirement.

## Verification discipline

Path completeness, compilation, security, retention, integration behavior, benchmark, demo, live smoke, and release documentation are separate gates. Passing one does not imply the others passed.
