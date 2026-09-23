# WorkProof Runtime Source Manifest

## Required source tree

The current distribution-ready tree contains **236 required paths** enforced by `scripts/verify-source-tree.js`. The count is kept synchronized with the executable source-tree gate; every required path is present on the current main lineage.

The historical v3.4 implementation closeout was 171 paths. The current stable distribution additionally covers the release/container, interoperability, diagnostics, current release metadata, network-boundary hardening, and reproducible-install surfaces.

- `Dockerfile`
- `scripts/verify-container-base.js`
- `.dockerignore`
- `compose.production.yaml`
- `.github/workflows/release.yml`
- `.github/workflows/container.yml`
- `.github/CODEOWNERS`
- `.github/dependabot.yml`
- `docs/CONTAINER-RUNTIME.md`
- `docs/PRODUCTION-DEPLOYMENT.md`
- `docs/RELEASE-3.4.0-dev.2.md`
- `docs/PRODUCT-READINESS-V1.md`
- `test/product-smoke.test.ts`
- `test/release-metadata.test.ts`
- `test/control-plane-execution-policy.test.ts`

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
- product readiness PR #74: local-first product gate and restart smoke

## v3.8.9 distribution evidence

- release reconciliation baseline: `54570624e0a3c2c35605cf3e17b7a48c6c5758c6`
- release workflow #245: success
- container workflow #242: success
- package version: `3.8.9`
- stable release: `v3.8.9`
- stable release commit: `54570624e0a3c2c35605cf3e17b7a48c6c5758c6`
- GitHub Release ID: `394031450`
- GHCR image: `ghcr.io/ahmedsaturki/workproof-runtime:3.8.9`
- GHCR digest: `sha256:ccde8ada2227b016968328f9eec1849e7424d12c2acc89081c30ca191bb6df66`
- immutable image tag: `54570624e0a3c2c35605cf3e17b7a48c6c5758c6`
- reproducible-install hardening PR #97: merged
- release-metadata/source-manifest PR #98: merged
- Control Plane safety PR #102: merged
- network-boundary hardening PR #104: merged
- v3.8.2 superseded after Container runtime smoke failure; rollback remains v3.8.1
- `npm ci` is enforced by CI, release, and Docker build paths
- package metadata declares `Apache-2.0`; the repository license file contains the complete Apache License 2.0 text
- executable source-tree gate currently verifies 226 required paths

## v3.8.13 distribution evidence

- package version: `3.8.13`
- stable release: `v3.8.13`
- release branch: `release/3.8.13`
- release commit: `dadef28ce8fbd299201a228673f1c2737c5b7d62`
- GitHub Release ID: `394849659`
- release workflow #305: success
- container workflow #302: success
- GHCR digest: `sha256:c9a9f6f6f0fb111dc64d42b1a2746091f14366c389c1af6eb3b0683c6e3fe564`
- commit-addressed image tag: `dadef28ce8fbd299201a228673f1c2737c5b7d62`
- five release assets published and SHA256-verified
- live Solo Governance verification remained active
- CodeQL JavaScript/TypeScript and Actions analysis passed with zero findings on the release candidate head

## v3.8.12 distribution evidence

- package version: `3.8.12`
- stable release: `v3.8.12`
- release branch: `release/3.8.12`
- release commit: `19b1efbfbc5f6f2d14eae5538f339667bd9fbb92`
- GitHub Release ID: `394761988`
- release workflow #284: success
- container workflow #281: success
- GHCR digest: `sha256:5690c65d0425c743c4fa0ebc1a31f913497eb6b7d4e8fa11a129a833aa926d5d`
- commit-addressed image tag: `19b1efbfbc5f6f2d14eae5538f339667bd9fbb92`
- five release assets published and SHA256-verified
- live Solo Governance verification remained active
- CodeQL JavaScript/TypeScript and Actions analysis passed with zero findings on the release candidate head

## v3.8.11 previous stable distribution evidence

- package version: `3.8.11`
- stable release: `v3.8.11`
- release commit: `9568cb2daffdd2f142f6112b1a6bd2c9cdbc4298`
- GitHub Release ID: `394667295`
- release workflow #265: success
- container workflow #262: success
- GHCR digest: `sha256:9ad675ba540959c8ada0254f6c133c5fd51eaf02319fe8032b39738f34ea5088`
- commit-addressed image tag: `9568cb2daffdd2f142f6112b1a6bd2c9cdbc4298`

## Verified main lineage

- current verified release lineage: v3.8.13
- current stable release commit: `dadef28ce8fbd299201a228673f1c2737c5b7d62`
- release workflow #305: success
- container workflow #302: success
- GHCR digest: `sha256:c9a9f6f6f0fb111dc64d42b1a2746091f14366c389c1af6eb3b0683c6e3fe564`
- v3.3 implementation merge: `c5e951056461c37f45bed8bb8406d119880d63df`
- v3.3 closeout correction: `0c92a8c86950776243646de4bb40b0c0f2fe5876`
- v3.4 implementation merge: `fe662d5bb5337bde18772f22864434935d59f66f`
- v3.4 final closeout record: `db96cf137bc744a523cb175dd4e0ba95c0646e60`
- trust-sync deterministic tamper regression: `dc2d86bfb8fe8a4cff480a38582f7eea4cd0f0ff`
- release distribution baseline: `c1c1f378d0e79acfc4ee22d5d2ca3fa389e8402d`

## Verification discipline

Path completeness, compilation, security, retention, integration behavior, benchmark, demo, live smoke, release artifacts, container publication, and network-boundary regressions are separate gates. Passing one does not imply the others passed.
