# WorkProof Runtime Status

Date: 2026-09-22

## Main baseline

Main contains the verified v3.4 benchmark, restart/resume safety, portable proof, and versioned proof compatibility.

## Dev.7 release target

- version: `3.4.0-dev.7`
- branch: `release/3.4.0-dev.7`
- product additions: operator guidance UX, production Compose restart/persistence smoke, package docs/examples, exact release-context container fallback
- release and container publication are gated by independent verification

## Verified runtime gates

- [x] TypeScript build
- [x] dependency security audit
- [x] source-tree verification
- [x] Chromium/CDP preflight
- [x] package installation smoke
- [x] retention lifecycle
- [x] full unit/integration suite
- [x] M001-M005 benchmark
- [x] demo
- [x] CLI proof verification
- [x] CLI mission execution
- [x] live GitHub integration smoke
- [x] restart/resume safety
- [x] idempotency operation/input drift protection
- [x] portable proof lifecycle
- [x] proof compatibility policy
- [x] operator guidance UX tests
- [x] production Compose restart/persistence smoke

## Benchmark

M001-M005: 5/5 verified.

verifiedCompletionRate: 1.0
falseDoneCount: 0
duplicateExternalEffectCount: 0
ambiguousOutcomeResolvedCount: 1
capabilitySubstitutionCount: 1
evidenceCompleteRate: 1.0
humanInterventionCount: 0

## Distribution boundary

- [x] source archive
- [x] package artifact
- [x] GitHub Release verification
- [x] GHCR container verification
- [x] localhost-bound production compose
- [x] production deployment runbook
- [ ] public production host/DNS/TLS/auth/secrets provisioning

The unchecked item is external infrastructure and is not inferred from repository state.

## Remaining product gates

- [ ] disposable external deployment validation with real TLS/auth/secrets/backup/rollback
- [ ] broader multi-capability mission UX beyond the current benchmark
- [ ] richer operational visualization

## Integrity rule

A capability receipt is not proof. Work is verified only when independent evidence satisfies the Work Contract.
