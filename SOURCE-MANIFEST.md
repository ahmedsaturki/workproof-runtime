# WorkProof Runtime Source Manifest

## Required source tree

The current v1.0 main tree contains **75 required paths** enforced by scripts/verify-source-tree.js.

V0.6 additions:
- docs/RELEASE-GATE-V0.6.md
- test/cli-integrity.test.ts

V0.7 additions:
- docs/RELEASE-GATE-V0.7.md
- packages/evidence/src/signature.ts
- test/signature.test.ts

V0.8 additions:
- docs/RELEASE-GATE-V0.8.md
- packages/evidence/src/trust.ts
- test/trust.test.ts
- test/trust-cli.test.ts

V0.9 additions:
- packages/evidence/src/vault.ts
- test/vault.test.ts
- test/vault-cli.test.ts

V1.0 additions:
- apps/registry-server.ts
- docs/RELEASE-GATE-V1.0.md
- packages/registry/src/client.ts
- packages/registry/src/http.ts
- test/registry-client.test.ts
- test/registry.test.ts

## Verified main
- commit: 265a580b1352a610957e88c0954a02e736ad6886
- v1.0 merged-main CI run #175: success
- result: source audit + build + 55 tests + benchmark/demo/CLI + browser/HTTP/publication/recovery paths + live GitHub read smoke passed
- v1.0 self-hosted registry is merged and verified on main

## Verification discipline
Path completeness, compilation, tests, benchmark, live smoke, and acceptance behavior are separate gates. Passing one does not imply the others passed.