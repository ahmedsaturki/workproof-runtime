# WorkProof Runtime Status

Date: 2026-09-22

## Main verified baseline

Main contains the v3.4 executable benchmark, restart/resume safety, portable proof, explicit proof compatibility, operator guidance, packaged operator docs/examples, multi-capability execution, external-topology validation, and distribution hardening.

## Current main

- package version: `3.4.0-dev.12`
- release target commit: `1b174b33da8e519e5a23e7565944aba6266d8e97`

## Current verified release

- version: `3.4.0-dev.12`
- tag: `v3.4.0-dev.12`
- release commit: `1b174b33da8e519e5a23e7565944aba6266d8e97`
- GitHub Release id: 393489868
- release verification run #124: success
- GHCR image: `ghcr.io/ahmedsaturki/workproof-runtime:3.4.0-dev.12`
- GHCR digest: `sha256:491261f71ff3b010bb7a967b74b348ca40042d3150e2f6c8a36c1a4dcf7012bb`
- immutable image tag: `1b174b33da8e519e5a23e7565944aba6266d8e97`
- Container verification run #127: success
- five release assets present, re-downloaded, and SHA256-verified

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
- [ ] public production host/DNS/TLS/auth/secrets provisioning

The disposable topology gate verifies TLS, authentication, secret non-leakage, persistent state, backup/restore, rollback to a previous immutable release, and deny-by-default network exposure. The release smoke additionally binds the published tag to the verified immutable digest. Public infrastructure remains a separate external resource.

## Verification rule

A capability receipt is not independent proof. Work is verified only when independent evidence satisfies the Work Contract and the published artifact remains verifiable outside the running operator.
