# WorkProof Runtime Source Manifest

## Required source tree

The verified v1.1 authenticated registry main tree contains **82 required paths** enforced by scripts/verify-source-tree.js.

V1.1 additions:
- docs/RELEASE-GATE-V1.1.md
- docs/SECURITY-V1.1.md
- packages/registry/src/auth.ts
- test/registry-auth-cli.test.ts
- test/registry-auth.test.ts
- test/registry-security.test.ts

## Verified main

- commit: 7eeefa13afa56acb9db5038ec3b5885f0724e46f
- v1.1 merge CI run: #216 (in progress at documentation checkpoint; latest feature gate itself passed before merge)
- v1.0 baseline CI: verified.
- v1.1 feature gate: source audit + dependency audit + build/test + benchmark/demo/CLI + live GitHub smoke passed.

## Verification discipline

Path completeness, compilation, tests, benchmark, live smoke, and acceptance behavior are separate gates. Passing one does not imply the others passed.
