# WorkProof Runtime Status

Date: 2026-09-22

## Main verified baseline

The current stable release line is **v3.8.4**. Main CI is required to verify every post-release reconciliation.

Main contains the v3.4 executable benchmark, restart/resume safety, portable proof, explicit proof compatibility, operator guidance, packaged operator docs/examples, multi-capability execution, external-topology validation, distribution hardening, Control Plane policy/idempotency safety, network-boundary hardening, immutable container-base provenance, and bounded production resource/log controls.

## Current stable v3.8.4

- package version: `3.8.4`
- stable release tag: `v3.8.4`
- stable release commit: `a232ed61ec5c5307c5ae3edc40f4c157d3f69432`
- GitHub Release ID: `393951969`
- Release workflow #214: success
- Container workflow #211: success
- GHCR image: `ghcr.io/ahmedsaturki/workproof-runtime:3.8.4`
- GHCR digest: `sha256:0a756db6683db2bcdc2664dd35458e181782ed557b8dbb84f4f878f5b358bb50`
- immutable image tag: `a232ed61ec5c5307c5ae3edc40f4c157d3f69432`
- prior stable rollback: `v3.8.1` / `sha256:7908cc6a4473495b7b5c51f1a0527815f0a8ff0c6d9eaf20ebf1ddfb0479b5d0`

## Main verification basis

- package version: `3.8.4`
- verified release reconciliation target: `a232ed61ec5c5307c5ae3edc40f4c157d3f69432`
- release workflow #214: success
- container workflow #211: success
- release assets: five published and independently rechecked
- v3.8.4 container: exact commit revision, immutable digest, runtime health, Compose restart/persistence/resource/log envelope, disposable external topology, anonymous pull, backup/restore, rollback, and deny-by-default edge all verified

The v3.8.0 release remains historical provenance. v3.8.1 is the verified rollback target. v3.8.2 is retained as superseded release history and is not a rollback target. v3.8.3 remains historical stable provenance immediately preceding v3.8.4.

## Current main closeout

- v3.8.4 stable release: published and fully Container-verified
- v3.8.4 published lineage: reconciled to exact GitHub Release target and GHCR digest
- production Compose: pinned to exact v3.8.4 tag@digest
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
- [external] public host/DNS/TLS/auth/secrets provisioning is intentionally outside the repository's provisioned resources

The disposable topology gate verifies TLS, authentication, secret non-leakage, persistent state, backup/restore, rollback to a previous immutable release, and deny-by-default network exposure. Public infrastructure remains a separate external resource; the public-host portion is deployment provisioning, not a hidden runtime dependency.

## Verification rule

A capability receipt is not independent proof. Work is verified only when independent evidence satisfies the Work Contract and the published artifact remains verifiable outside the running operator.

## Historical release records

The historical v3.8.0, v3.8.1, v3.8.2, and v3.8.3 closeout records remain part of repository provenance. v3.8.2 is explicitly superseded and is not a rollback target.
