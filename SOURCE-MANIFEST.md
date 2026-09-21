# WorkProof Runtime Source Manifest

## Required source tree

The current distribution-ready tree contains **179 required paths** enforced by `scripts/verify-source-tree.js`.

The historical v3.4 implementation closeout was 171 paths; the final distribution layer adds 8 operational paths:

- `Dockerfile`
- `.dockerignore`
- `compose.production.yaml`
- `.github/workflows/release.yml`
- `.github/workflows/container.yml`
- `docs/CONTAINER-RUNTIME.md`
- `docs/PRODUCTION-DEPLOYMENT.md`
- `docs/RELEASE-3.4.0-dev.2.md`

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
- final main CI for the current main freeze commit: success

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
