# WorkProof Runtime Source Manifest

## Required source tree

The verified v3.3 implementation tree contains **162 required paths** enforced by scripts/verify-source-tree.js. The final audit documentation adds one required path, bringing the closeout target to 163. Closeout CI #811 verified all 163 required paths.

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

## Verified main

- v2.9 implementation merge commit: b8be593242d19e3251914855801fc505aa19a566
- CI preflight hardening merge commit: 437516fb39e6f8c7469fc4540a0cf85f5e950391
- v3.0 operational health merge commit: 4e0672fbbc51416d50330df47397b3162e50da72
- v3.1 SQLite pack merge commit: 449ad75806c3c0f1dab748598dd1f85c65047afc
- v3.2 data-transform merge commit: c3562b96df23c1c8d500c48e0591833e96236306
- v3.3 message-outbox implementation merge commit: c5e951056461c37f45bed8bb8406d119880d63df
- v3.3 documentation closeout commit: 5e26ab0bb78ebb986513c08abe0809c0d75a1145
- v2.9 final merged-main CI: #761
- v3.0 final merged-main CI: #780
- v3.1 final merged-main CI: #795
- v3.2 final merged-main CI: #800
- v3.3 feature CI: #808
- v3.3 implementation merged-main CI: #809
- v3.3 documentation closeout CI: #811
- result: source audit + dependency security + Chromium/CDP + strict build + retention + full suite + benchmark + demo + CLI + live GitHub smoke all passed for the verified v3.3 implementation

## Verification discipline

Path completeness, compilation, security, retention, integration behavior, benchmark, demo, live smoke, and release documentation are separate gates. Passing one does not imply the others passed.
