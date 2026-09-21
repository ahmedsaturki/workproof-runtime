# WorkProof Runtime Source Manifest

## Required source tree

The active v1.1 authenticated registry branch contains **82 required paths** enforced by scripts/verify-source-tree.js.

V1.1 additions:
- docs/RELEASE-GATE-V1.1.md
- packages/registry/src/auth.ts
- test/registry-auth-cli.test.ts
- test/registry-auth.test.ts
- test/registry-security.test.ts
- docs/SECURITY-V1.1.md

## Verified main

- commit: 265a580b1352a610957e88c0954a02e736ad6886
- v1.0 merged-main CI run #175: success
- result: source audit + build + 55 tests + benchmark/demo/CLI + browser/HTTP/publication/recovery paths + live GitHub read smoke passed
- active v1.1 branch extends the verified v1.0 registry with authenticated access and namespace isolation

## Verification discipline

Path completeness, compilation, tests, benchmark, live smoke, and acceptance behavior are separate gates. Passing one does not imply the others passed.