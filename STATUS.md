# WorkProof Runtime Status

Date: 2026-09-22

## Main verified baseline

Main contains the v3.4 executable benchmark, restart/resume safety, portable proof, explicit proof compatibility, operator guidance, packaged operator docs/examples, multi-capability execution, external-topology validation, and distribution hardening.

## Current main

- package version: `3.7.0-dev.1`
- release source tag commit: `f776ed9f5fcbb055f7da41ca69714c19b20f9aad`
- promotion branch: `promote/v3.7.0-dev.1-main`
- main closeout commit: `354cf4d660aec814ba83d0c44d7e3468d6b726ca`

## Current verified release

- version: `3.7.0-dev.1`
- tag: `v3.7.0-dev.1`
- release commit: `f776ed9f5fcbb055f7da41ca69714c19b20f9aad`
- GitHub Release id: 393526164
- release verification run #171: success
- GHCR image: `ghcr.io/ahmedsaturki/workproof-runtime:3.7.0-dev.1`
- GHCR digest: `sha256:28e8d9af0ab71442b33df8b72308089f520b5ba23128401c0a05675809ba1748`
- immutable image tag: `f776ed9f5fcbb055f7da41ca69714c19b20f9aad`
- Container verification run #168: success
- five release assets published and post-publication integrity verified

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


## v3.7 promotion

- [x] A2A 1.0 interoperability product surface
- [x] OTLP/HTTP JSON audit export
- [x] Work Object list/paging for SDK and adapters
- [x] expanded Studio operational timeline
- [x] packed A2A artifact smoke
- [x] release publication and GHCR digest verification
- [x] production Compose digest pin
- [x] post-merge main CI closeout (CI #1189)


## v3.8 release branch

- branch: `release/3.8.0-dev.1`
- source feature evidence: CI #1232 success
- release branch verification: in progress
- publication: not yet closed
- GHCR/Compose/main promotion: pending release verification
