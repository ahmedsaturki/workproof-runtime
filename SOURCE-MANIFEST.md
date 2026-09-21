# WorkProof Runtime Source Manifest

## Required source tree

The active v1.4.1 persistent-lease branch contains **100 required paths** enforced by scripts/verify-source-tree.js.

The v1.4 foundation adds:
- docs/RELEASE-GATE-V1.4.md
- packages/coordination/src/leases.ts
- test/leases.test.ts

The v1.4.1 persistent lease gate adds:
- docs/RELEASE-GATE-V1.4.1.md
- apps/lease-worker.ts
- packages/coordination/src/persistent.ts
- test/persistent-leases.test.ts

The browser-reliability correction adds:
- scripts/chromium-cdp-smoke.js (operational CI preflight; intentionally not part of the required source-path list)

The v1.3 lifecycle adds:
- docs/RELEASE-GATE-V1.3.md
- packages/evidence/src/retention.ts
- test/retention.test.ts

The v1.2 trust-sync foundation remains covered by:
- docs/RELEASE-GATE-V1.2.md
- docs/SECURITY-V1.2.md
- packages/evidence/src/trust-sync.ts
- packages/registry/src/trust-snapshots.ts
- trust-sync regression suites

## Main history

- v1.1 implementation verification commit: 7eeefa13afa56acb9db5038ec3b5885f0724e46f
- v1.2 merge commit: b6ef830d79dc432314a4da0f6e143ddb3a8b6f61
- v1.3 retention merge commit: db5c8fa296f13828ccc461c60916457b87af7168
- browser reliability merge commit: 6c01f201f6cec32ab6fa34a01fe878d3f47c5b0b
- verified merged-main CI: run #379 (v1.4 foundation)
- v1.4 foundation result: source audit + dependency audit + retention suite + full sequential suite + benchmark/demo/CLI/live GitHub smoke all passed after the worker-ownership merge.

## Verification discipline

Path completeness, compilation, tests, benchmark, live smoke, browser environment readiness, and acceptance behavior are separate gates. Passing one does not imply the others passed.
