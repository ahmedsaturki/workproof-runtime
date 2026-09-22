# WorkProof Runtime Status

Date: 2026-09-22

## v3.8.10 publication closeout

- package version: `3.8.10`
- stable release tag: `v3.8.10`
- stable release commit: `9daac7a926ce1631ac708a6c234379d622c56c19`
- GitHub Release ID: `394046514`
- Release workflow #261: success
- Container workflow #258: success
- GHCR image: `ghcr.io/ahmedsaturki/workproof-runtime:3.8.10`
- GHCR digest: `sha256:cad9c467db8fe82abd1b15d30d90dbf7e87ad6683f44a8c7c8763c327af6a1c8`
- commit-addressed image tag: `9daac7a926ce1631ac708a6c234379d622c56c19`
- purpose: corrective stable runtime distribution; published assets are anchored to release commit, with subsequent operator-facing lineage reconciliation recorded on `main`

## Main verified baseline

The current stable release line is **v3.8.10**. Main CI is required to verify every post-release reconciliation.

Main contains the v3.4 executable benchmark, restart/resume safety, portable proof, explicit proof compatibility, operator guidance, packaged operator docs/examples, multi-capability execution, external-topology validation, distribution hardening, Control Plane policy/idempotency safety, network-boundary hardening, immutable container-base provenance, and bounded production resource/log controls.

## Current stable v3.8.10

- package version: `3.8.10`
- stable release tag: `v3.8.10`
- stable release commit: `9daac7a926ce1631ac708a6c234379d622c56c19`
- GitHub Release ID: `394046514`
- Release workflow #261: success
- Container workflow #258: success
- GHCR image: `ghcr.io/ahmedsaturki/workproof-runtime:3.8.10`
- GHCR digest: `sha256:cad9c467db8fe82abd1b15d30d90dbf7e87ad6683f44a8c7c8763c327af6a1c8`
- commit-addressed image tag: `9daac7a926ce1631ac708a6c234379d622c56c19`
- prior stable rollback: `v3.8.1` / `sha256:7908cc6a4473495b7b5c51f1a0527815f0a8ff0c6d9eaf20ebf1ddfb0479b5d0`

## Published snapshot vs current main

The `v3.8.10` GitHub Release and source/container assets were verified against release commit `9daac7a926ce1631ac708a6c234379d622c56c19`. After publication, `main` received a documentation/lineage reconciliation so the current repository state matches the published GitHub Release and GHCR evidence. The reconciliation did not rewrite or retag the published release and did not change runtime semantics.

## Current main closeout

- v3.8.10 stable release: published and fully Container-verified
- current main lineage: reconciled to the exact GitHub Release target and GHCR digest
- production Compose: pinned to exact v3.8.10 tag@digest
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
