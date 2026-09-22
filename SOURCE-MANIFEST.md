# WorkProof Runtime Source Manifest

## Required source tree

The current distribution-ready tree contains **221 required paths** enforced by `scripts/verify-source-tree.js`. The count is kept synchronized with the executable source-tree gate; every required path is present on the current main lineage.

The historical v3.4 implementation closeout was 171 paths. The current stable distribution additionally covers the release/container, interoperability, diagnostics, current release metadata, and reproducible-install surfaces.

- `Dockerfile`
- `.dockerignore`
- `compose.production.yaml`
- `.github/workflows/release.yml`
- `.github/workflows/container.yml`
- `docs/CONTAINER-RUNTIME.md`
- `docs/PRODUCTION-DEPLOYMENT.md`
- `docs/RELEASE-3.4.0-dev.2.md`
- `docs/PRODUCT-READINESS-V1.md`
- `test/product-smoke.test.ts`
- `test/release-metadata.test.ts`
- `package-lock.json`
- `.github/CODEOWNERS`

## V3.4 benchmark

- implementation merge: `fe662d5bb5337bde18772f22864434935d59f66f`
- feature CI: #864
- merged-main CI: #866
- final documentation/source-tree closeout CI: #872
- final closeout record verification: #875
- M001-M005: 5/5 verified
- verifiedCompletionRate: 1
- falseDoneCount: 0
- duplicateExternalEffectCount: 0
- ambiguousOutcomeResolvedCount: 1
- capabilitySubstitutionCount: 1
- evidenceCompleteRate: 1
- humanInterventionCount: 0

## v3.4.0-dev.2 distribution evidence

- release tag: `v3.4.0-dev.2`
- release id: 393311702
- release target: `c1c1f378d0e79acfc4ee22d5d2ca3fa389e8402d`
- release verification run: #30 (success)
- container verification run: #27 (success)
- GHCR digest: `sha256:2df71bf775272b9227979687de0c93d80f08814b83d7eb19e37e14dd63d8740b`
- latest main CI: success
- product readiness PR #74: local-first product gate and restart smoke

## Current v3.8.0 distribution state

- verified main hardening baseline: `f391ae4ce60f0fd102c731c78551d258fbde1f12`
- main CI #1260: success on that baseline
- current package version: `3.8.0`
- stable release: `v3.8.0`
- stable release commit: `2b02d22e897d5fe736f93267c72036d951f74082`
- GitHub Release: `393558255`
- GHCR digest: `sha256:f057384da7a5789aa71ffcec0ea4589ec8c10e7a9e1b37f8cabcabd303d38fcc`
- reproducible-install hardening PR #97: merged
- release-metadata/source-manifest PR #98: merged
- `npm ci` is enforced by CI, release, and Docker build paths
- package metadata declares `Apache-2.0`; the repository license file contains the complete Apache License 2.0 text
- executable source-tree gate currently verifies 221 required paths

## Verified main lineage

- latest main: current branch freeze commit
- v3.3 implementation merge: `c5e951056461c37f45bed8bb8406d119880d63df`
- v3.3 closeout correction: `0c92a8c86950776243646de4bb40b0c0f2fe5876`
- v3.4 implementation merge: `fe662d5bb5337bde18772f22864434935d59f66f`
- v3.4 final closeout record: `db96cf137bc744a523cb175dd4e0ba95c0646e60`
- trust-sync deterministic tamper regression: `dc2d86bfb8fe8a4cff480a38582f7eea4cd0f0ff`
- release distribution baseline: `c1c1f378d0e79acfc4ee22d5d2ca3fa389e8402d`

## Verification discipline

Path completeness, compilation, security, retention, integration behavior, benchmark, demo, live smoke, release artifacts, and container publication are separate gates. Passing one does not imply the others passed.
