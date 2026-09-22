# WorkProof Runtime Status

Date: 2026-09-22

## Main verified baseline

Main contains the v3.4 benchmark, restart/resume safety, portable proof, explicit proof compatibility, operator guidance, and packaging improvements.

## Current release

- version: `3.4.0-dev.9`
- branch: `release/3.4.0-dev.9`
- parent candidate: `15de76521f63100249eccd12c5e4f94643c8ab83`
- purpose: coherent distribution after dev.7 candidate lineage was superseded by the clean dev.8 release branch

## Product gates included

- [x] local WorkProof Studio
- [x] packaged `workctl`
- [x] Work Object restart/resume
- [x] idempotency operation/input drift protection
- [x] portable proof export/verify/import
- [x] versioned proof compatibility
- [x] operator guidance UX
- [x] production Compose restart/persistence smoke
- [x] exact release-commit Docker build context
- [x] package includes docs/examples

## Distribution gates

- [x] GitHub Release v3.4.0-dev.9 publication and re-download verification
- [x] GHCR v3.4.0-dev.9 publication, health, anonymous pull, and digest verification
- [ ] main promotion CI after release

## Benchmark

M001-M005: 5/5 verified.
verifiedCompletionRate: 1.0
falseDoneCount: 0
duplicateExternalEffectCount: 0
ambiguousOutcomeResolvedCount: 1
capabilitySubstitutionCount: 1
evidenceCompleteRate: 1
humanInterventionCount: 0

## External boundary

- [x] reproducible source distribution
- [x] local production compose
- [x] production deployment runbook
- [ ] public production host/DNS/TLS/auth/secrets provisioning

## Remaining product gates

- [ ] disposable external deployment with real TLS/auth/secrets/backup/rollback
- [ ] broader multi-capability mission UX
- [ ] richer operational visualization

A capability receipt is never treated as independent proof. Verification requires evidence satisfying the Work Contract.
