# WorkProof Runtime Status

Date: 2026-09-22

## Main verified baseline

The current stable release line is v3.8.3; main CI is required to verify every post-release reconciliation.

Main contains the v3.4 executable benchmark, restart/resume safety, portable proof, explicit proof compatibility, operator guidance, packaged operator docs/examples, multi-capability execution, external-topology validation, distribution hardening, Control Plane policy/idempotency safety, and network-boundary hardening.

## Current stable v3.8.3

- package version: `3.8.3`
- stable release tag: `v3.8.3`
- stable release commit: `772a5a16b34e94b62bbc6564474736ef2e4da11b`
- GitHub Release ID: `393862783`
- Release workflow #210: success
- Container workflow #207: success
- GHCR image: `ghcr.io/ahmedsaturki/workproof-runtime:3.8.3`
- GHCR digest: `sha256:ec6f891f8e3fc427937f904eb039d95d58387b1d06261cd91c8c9a886bc7cf67`
- immutable image tag: `772a5a16b34e94b62bbc6564474736ef2e4da11b`
- prior stable rollback: `v3.8.1` / `sha256:7908cc6a4473495b7b5c51f1a0527815f0a8ff0c6d9eaf20ebf1ddfb0479b5d0`
- Control Plane execution-policy and terminal-idempotency safety fixes: merged in PR #102
- network-boundary hardening: merged in PR #104

## Main verification basis

- package version: `3.8.3`
- verified release reconciliation target: `772a5a16b34e94b62bbc6564474736ef2e4da11b`
- release workflow #210: success
- container workflow #207: success
- stable release source commit: `772a5a16b34e94b62bbc6564474736ef2e4da11b`
- post-release hardening PR #97: merged; reproducible `npm ci` install tree
- post-release hardening PR #98: merged; release metadata/license/source-manifest reconciliation
- repository hardening PR #101: merged; immutable workflow pins, CODEOWNERS coverage, source-manifest reconciliation, and security reporting boundary
- Control Plane safety PR #102: merged; execution policy, non-loopback auth boundary, terminal idempotency failure replay
- network-boundary PR #104: merged; Studio loopback boundary, Registry non-loopback auth requirement, and regression coverage

The v3.8.0 release remains historical provenance. v3.8.1 is the verified rollback target. v3.8.2 is retained as superseded release history and is not a rollback target. Current main carries the v3.8.3 corrective stable distribution.

## Current verified release

- version: `3.8.3`
- tag: `v3.8.3`
- release commit: `772a5a16b34e94b62bbc6564474736ef2e4da11b`
- GitHub Release ID: 393862783
- release verification run #210: success
- Container verification run #207: success
- GHCR image: `ghcr.io/ahmedsaturki/workproof-runtime:3.8.3`
- GHCR digest: `sha256:ec6f891f8e3fc427937f904eb039d95d58387b1d06261cd91c8c9a886bc7cf67`
- immutable image tag: `772a5a16b34e94b62bbc6564474736ef2e4da11b`
- five release assets published and verified

## Current main closeout

- PR #103: merged; v3.8.1 stable distribution reconciliation
- v3.8.3 corrective stable release: published and fully Container-verified
- v3.8.2: superseded after Container runtime smoke failure
- PR #104: merged; network-boundary and status hardening
- post-release reconciliation is subject to its own main CI verification
- the v3.8.3 stable release is the current distribution artifact; v3.8.1 remains the verified rollback target

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
- [x] pinned localhost production compose
- [x] production deployment runbook
- [x] disposable external-topology smoke with TLS/auth/backup/restore/rollback
- [external] public host/DNS/TLS/auth/secrets provisioning is intentionally outside the repository's provisioned resources

The disposable topology gate verifies TLS, authentication, secret non-leakage, persistent state, backup/restore, rollback to a previous immutable release, and deny-by-default network exposure. The release smoke additionally binds the published tag to the verified immutable digest. Public infrastructure remains a separate external resource; the public-host portion is deployment provisioning, not a hidden runtime dependency.

## Verification rule

A capability receipt is not independent proof. Work is verified only when independent evidence satisfies the Work Contract and the published artifact remains verifiable outside the running operator.

## Historical release records

The historical v3.8.0, v3.8.1, and v3.8.2 closeout records are retained below for provenance. v3.8.2 is explicitly superseded and not a rollback target.
