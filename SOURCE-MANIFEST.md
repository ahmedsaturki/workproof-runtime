# WorkProof Runtime Source Manifest

## Required source tree

The v3.4 benchmark implementation tree contains 171 required paths enforced by scripts/verify-source-tree.js and verified by the final v3.4 audit closeout.

V3.4 additions include:
- docs/BENCHMARK-V3.md
- docs/FINAL-AUDIT-V3.4.md
- docs/RELEASE-GATE-V3.4.md
- docs/packs/git-local-pack.json
- lab/fixtures/git-local-pack.json
- packages/packs/src/git-local-pack.ts
- test/git-local-pack.test.ts
- test/operator-benchmark.test.ts

V3.3 additions include:
- docs/FINAL-AUDIT-V3.3.md
- docs/RELEASE-GATE-V3.3.md
- docs/packs/message-outbox-pack.json
- lab/fixtures/message-outbox-pack.json
- packages/packs/src/message-outbox-pack.ts
- test/message-outbox.test.ts

V3.2 additions include:
- docs/FINAL-AUDIT-V3.2.md
- docs/RELEASE-GATE-V3.2.md
- docs/packs/data-transform-pack.json
- lab/fixtures/data-transform-pack.json
- packages/packs/src/data-transform-pack.ts
- test/data-transform.test.ts

V3.1 additions include:
- docs/FINAL-AUDIT-V3.1.md
- docs/RELEASE-GATE-V3.1.md
- docs/packs/sqlite-pack.json
- lab/fixtures/database-pack.json
- packages/packs/src/sqlite-pack.ts
- test/sqlite.test.ts

## v0.4 local exact history

- local commit: 8cd9b7d841191b8a030bb462ac8dbd271f8259ca
- tag: v0.4.0-dev
- exact development bundle: workproof-runtime-v0.4.0-dev.bundle

## V3.4 benchmark branch

- feature branch: feature/v3.4-operator-benchmark
- implementation merge commit: fe662d5bb5337bde18772f22864434935d59f66f
- feature CI: #864
- merged-main CI: #866
- final documentation/source-tree closeout CI: #872 (success)
- final closeout record correction commit: db96cf137bc744a523cb175dd4e0ba95c0646e60
- final closeout record verification CI: #875 (success)

## v3.4 verified benchmark evidence

- M001-M005: all verified
- verifiedCompletionRate: 1
- falseDoneCount: 0
- duplicateExternalEffectCount: 0
- ambiguousOutcomeResolvedCount: 1
- capabilitySubstitutionCount: 1
- evidenceCompleteRate: 1
- humanInterventionCount: 0
- merged-main benchmark artifact: workflow run #866

## Verified main

- v2.9 implementation merge commit: b8be593242d19e3251914855801fc505aa19a566
- CI preflight hardening merge commit: 437516fb39e6f8c7469fc4540a0cf85f5e950391
- v3.0 operational health merge commit: 4e0672fbbc51416d50330df47397b3162e50da72
- v3.1 SQLite pack merge commit: 449ad75806c3c0f1dab748598dd1f85c65047afc
- v3.2 data-transform merge commit: c3562b96df23c1c8d500c48e0591833e96236306
- v3.3 message-outbox implementation merge commit: c5e951056461c37f45bed8bb8406d119880d63df
- v3.3 documentation closeout baseline commit: 5e26ab0bb78ebb986513c08abe0809c0d75a1145
- v3.3 closeout record correction commit: 0c92a8c86950776243646de4bb40b0c0f2fe5876
- v2.9 final merged-main CI: #761
- v3.0 final merged-main CI: #780
- v3.1 final merged-main CI: #795
- v3.2 final merged-main CI: #800
- v3.3 feature CI: #808
- v3.3 implementation merged-main CI: #809
- v3.3 documentation closeout CI: #811
- v3.3 closeout record correction CI: #812
- result: source audit + dependency security + Chromium/CDP + strict build + retention + full suite + benchmark + demo + CLI + live GitHub smoke all passed for the verified v3.3 implementation

## Verification discipline

Path completeness, compilation, security, retention, integration behavior, benchmark, demo, live smoke, and release documentation are separate gates. Passing one does not imply the others passed.
