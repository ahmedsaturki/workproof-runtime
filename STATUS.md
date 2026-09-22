# WorkProof Runtime Status

Date: 2026-09-22

## Main verified baseline

Main contains the v3.4 executable benchmark, restart/resume safety, portable proof, explicit proof compatibility, operator guidance, packaged operator docs/examples, multi-capability execution, external-topology validation, and distribution hardening.

## Current main

- package version: `3.6.0-dev.1`
- release source tag commit: `de3ad9fcc10b9db7487c78620607f669249adaa9`
- main closeout commit: `04bf0c218badd18c6a20e343030fbad71345d835`

## v3.7.0-dev.1 release branch

- branch: `release/3.7.0-dev.1`
- source candidate: `5ebf4dccfab702f58e20e2b544becc706ee921a8`
- publication workflows are expected to validate this exact release branch before distribution.

## v3.7.0-dev.1 candidate

- branch: `feature/v3.7-a2a-otel-completion`
- candidate commit: `197a2598d3d338bd15b9a8b7678fce090fa689f9`
- feature CI #1179: success
- A2A 1.0 interoperability adapter: implemented and tested
- OTLP/HTTP JSON audit export: implemented and tested
- paged/context-aware Work listing: implemented and tested
- expanded Studio operational timeline: implemented and tested
- packed A2A artifact smoke: implemented and tested
- release status: candidate; publication gate not yet closed

## Current verified release

- version: `3.6.0-dev.1`
- tag: `v3.6.0-dev.1`
- release commit: `de3ad9fcc10b9db7487c78620607f669249adaa9`
- GitHub Release id: 393506625
- release verification run #161: success
- GHCR image: `ghcr.io/ahmedsaturki/workproof-runtime:3.6.0-dev.1`
- GHCR digest: `sha256:2c5ba1b58697ec545cf7098d93e8750394b9b1e2ccd9e8f45b647cec689bd247`
- immutable image tag: `de3ad9fcc10b9db7487c78620607f669249adaa9`
- Container verification run #158: success
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
- [ ] public production host/DNS/TLS/auth/secrets provisioning

The disposable topology gate verifies TLS, authentication, secret non-leakage, persistent state, backup/restore, rollback to a previous immutable release, and deny-by-default network exposure. The release smoke additionally binds the published tag to the verified immutable digest. Public infrastructure remains a separate external resource; the public-host portion is deployment provisioning, not a hidden runtime dependency.

## Verification rule

A capability receipt is not independent proof. Work is verified only when independent evidence satisfies the Work Contract and the published artifact remains verifiable outside the running operator.
