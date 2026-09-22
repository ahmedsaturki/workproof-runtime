# WorkProof Runtime Status

Date: 2026-09-22

## Main verified baseline

Main contains the v3.4 executable benchmark, restart/resume safety, portable proof, explicit proof compatibility, operator guidance, packaged operator docs/examples, and distribution hardening.

## Current main

- commit: `dfdd92f5a5840f08ceba420b92a2f0a540145df4`
- main CI #1008: success
- package version: `3.4.0-dev.9`

## Current verified release

- version: `3.4.0-dev.9`
- tag: `v3.4.0-dev.9`
- release commit: `3041aeb49241dc50daae56ba70763bc61aeb29bf`
- GitHub Release id: 393389908
- release verification run #98: success
- GHCR image: `ghcr.io/ahmedsaturki/workproof-runtime:3.4.0-dev.9`
- GHCR digest: `sha256:3acde2ee0e82c0d7bf1e9bd8217aa774e1ceb5cdafd64150b87b7581aa0ea04d`
- immutable image tag: `3041aeb49241dc50daae56ba70763bc61aeb29bf`
- Container verification run #95: success
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
- [ ] disposable external-topology smoke on the new main closeout branch
- [ ] public production host/DNS/TLS/auth/secrets provisioning

The disposable topology gate verifies TLS, authentication, secret non-leakage, persistent state, backup/restore, rollback to a previous immutable release, and deny-by-default network exposure. Public infrastructure remains a separate external resource.

## Verification rule

A capability receipt is not independent proof. Work is verified only when independent evidence satisfies the Work Contract and the published artifact remains verifiable outside the running operator.
