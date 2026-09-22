# WorkProof Runtime Status

Date: 2026-09-22

## Main verified baseline

Main contains the v3.4 executable benchmark, restart/resume safety, portable proof, explicit proof compatibility, operator guidance, packaged operator docs/examples, and distribution hardening.

## Current main

- package version: `3.4.0-dev.10`
- current main closeout CI is the final gate for this merge

## Current verified release

- version: `3.4.0-dev.10`
- tag: `v3.4.0-dev.10`
- release commit: `620ae90f396319630ef6913b66a664634d695039`
- GitHub Release id: 393463668
- release verification run #113: success
- GHCR image: `ghcr.io/ahmedsaturki/workproof-runtime:3.4.0-dev.10`
- GHCR digest: `sha256:3fa81f645ccb0c13e0dbfd5da13c089e982f5ed85a0c79b5ec49e021820315fa`
- immutable image tag: `620ae90f396319630ef6913b66a664634d695039`
- Container verification run #110: success
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

The disposable topology gate verifies TLS, authentication, secret non-leakage, persistent state, backup/restore, rollback to a previous immutable release, and deny-by-default network exposure. Public infrastructure remains a separate external resource.

## Verification rule

A capability receipt is not independent proof. Work is verified only when independent evidence satisfies the Work Contract and the published artifact remains verifiable outside the running operator.
