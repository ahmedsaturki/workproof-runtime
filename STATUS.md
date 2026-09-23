# WorkProof Runtime Status

Date: 2026-09-23

## v3.8.12 publication closeout

- package version: `3.8.12`
- stable release tag: `v3.8.12`
- stable release commit: `19b1efbfbc5f6f2d14eae5538f339667bd9fbb92`
- GitHub Release ID: `394761988`
- Release workflow #284: success
- Container workflow #281: success
- GHCR image: `ghcr.io/ahmedsaturki/workproof-runtime:3.8.12`
- GHCR digest: `sha256:5690c65d0425c743c4fa0ebc1a31f913497eb6b7d4e8fa11a129a833aa926d5d`
- commit-addressed image tag: `19b1efbfbc5f6f2d14eae5538f339667bd9fbb92`
- five release assets published and SHA256-verified
- publication verification confirmed benchmark semantics, source/package version alignment, release/tag lineage, and final GHCR provenance

## Main verified baseline

The current stable release line is **v3.8.12**. Main CI is required to verify every post-release reconciliation.

Main contains the v3.4 executable benchmark, restart/resume safety, portable proof, explicit proof compatibility, operator guidance, packaged operator docs/examples, multi-capability execution, external-topology validation, distribution hardening, Control Plane policy/idempotency safety, network-boundary hardening, immutable container-base provenance, and bounded production resource/log controls.

## Previous stable v3.8.11

- package version: `3.8.11`
- stable release tag: `v3.8.11`
- stable release commit: `9568cb2daffdd2f142f6112b1a6bd2c9cdbc4298`
- GitHub Release ID: `394667295`
- Release workflow #265: success
- Container workflow #262: success
- GHCR digest: `sha256:9ad675ba540959c8ada0254f6c133c5fd51eaf02319fe8032b39738f34ea5088`
- commit-addressed image tag: `9568cb2daffdd2f142f6112b1a6bd2c9cdbc4298`

## Published snapshot vs current main

The `v3.8.12` GitHub Release and source/container assets were verified against release commit `19b1efbfbc5f6f2d14eae5538f339667bd9fbb92`. The current `main` reconciliation records the published GitHub Release and GHCR evidence without rewriting or retagging the published release and without changing runtime semantics.

## Current main closeout

- v3.8.12 stable release: published and fully Container-verified
- current main lineage: reconciled to the exact v3.8.12 GitHub Release target and GHCR digest
- production Compose: pinned to exact v3.8.12 tag@digest
- container base: immutable Node 24.21.0 Trixie slim digest enforced by CI/Release/Container
- production resource envelope: init, 10s stop grace, 1 CPU, 1 GiB RAM, 512 PIDs, 10 MiB × 3 JSON log rotation

## Product gates

- [x] local WorkProof Studio
- [x] packaged `workctl`
- [x] Work Object restart/resume
- [x] idempotency operation/input drift protection
- [x] portable proof export/verify/import
- [x] versioned proof compatibility
- [x] operator guidance UX for failure/ambiguity/recovery/verification
- [x] operational overview and attention summary
- [x] production Compose restart/persistence smoke
- [x] production Compose resource/log envelope smoke
- [x] exact release-commit Docker build context
- [x] package includes operator docs and representative mission examples
- [x] representative multi-capability mission
- [x] Studio capability-chain visibility
- [x] disposable external-topology TLS/auth/backup/restore/rollback smoke
- [x] authenticated capability inventory and Studio registry visibility
- [x] packed control-plane product smoke
- [x] Control Plane execution-policy enforcement
- [x] terminal failed-idempotency replay safety
- [x] Studio loopback network boundary
- [x] Registry non-loopback authentication boundary
- [x] immutable container base provenance

## Benchmark

M001-M005: 5/5 verified.

- verifiedCompletionRate: 1.0
- falseDoneCount: 0
- duplicateExternalEffectCount: 0
- ambiguousOutcomeResolvedCount: 1
- capabilitySubstitutionCount: 1
- evidenceCompleteRate: 1.0
- humanInterventionCount: 0

## Distribution and operations

- [x] reproducible source distribution
- [x] npm-compatible package artifact
- [x] GitHub Release publication and post-publication verification
- [x] GHCR publication and anonymous pull verification
- [x] pinned localhost production Compose
- [x] production deployment runbook
- [x] disposable external-topology smoke with TLS/auth/backup/restore/rollback
- [x] immutable container-base verification
- [x] bounded production resource/log envelope
- [external] public host/DNS/TLS/auth/secrets provisioning and GitHub Release/tag immutability controls are intentionally outside the repository's current provisioned resources

The disposable topology gate verifies TLS, authentication, secret non-leakage, persistent state, backup/restore, rollback to a previous verified digest-pinned release, and deny-by-default network exposure. Public infrastructure remains a separate external resource; the public-host portion is deployment provisioning, not a hidden runtime dependency.

## Verification rule

A capability receipt is not independent proof. Work is verified only when independent evidence satisfies the Work Contract and the published artifact remains verifiable outside the running operator.

## Historical release records

The historical v3.8.0, v3.8.1, v3.8.2, and v3.8.3 closeout records remain part of repository provenance. v3.8.2 is explicitly superseded and is not a rollback target.
