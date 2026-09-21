# WorkProof Runtime Status

Date: 2026-09-22

Verification note: this status snapshot is itself CI-gated on the current main commit.
The recorded latest-main gate above is CI #922; this follow-up documentation commit is also CI-gated.
Chromium CDP smoke is environment-isolated from D-Bus and uses a bounded startup window.

## Current main

**v3.4 benchmark and v3.4.0-dev.2 distribution path are verified.**

Latest main: the current branch head; see the GitHub ref and the latest CI run for the exact commit SHA.

Since the release target `c1c1f378d0e79acfc4ee22d5d2ca3fa389e8402d`, main has added distribution hardening, documentation corrections, and deterministic persistent-lease test hardening. The published v3.4.0-dev.2 runtime source remains pinned to the release target.

## Verified main gates

- [x] source tree: 179/179
- [x] dependency security audit: 0 vulnerabilities
- [x] Chromium/CDP preflight
- [x] strict TypeScript build
- [x] retention lifecycle
- [x] full unit/integration suite
- [x] operator benchmark
- [x] demo
- [x] CLI proof verification
- [x] CLI mission execution
- [x] live GitHub integration smoke
- [x] Main CI for latest main: success

## Verified v3.3 gates

- [x] deterministic local RFC-style message composition
- [x] deterministic Message-ID and SHA-256 identity
- [x] digest-addressed local outbox persistence
- [x] idempotent duplicate handling
- [x] strict address/header validation
- [x] message size bounds
- [x] evidence-bearing capability result
- [x] independent persisted-message verification
- [x] pack manifest and fixture
- [x] CLI registration
- [x] feature CI
- [x] merged-main CI

## Verified v3.4 benchmark

M001-M005 all verify successfully:

- verifiedCompletionRate: 1.0
- falseDoneCount: 0
- duplicateExternalEffectCount: 0
- ambiguousOutcomeResolvedCount: 1
- capabilitySubstitutionCount: 1
- evidenceCompleteRate: 1.0
- humanInterventionCount: 0

## Release distribution

### GitHub Release

- tag: `v3.4.0-dev.2`
- release id: 393311702
- target commit: `c1c1f378d0e79acfc4ee22d5d2ca3fa389e8402d`
- release verification run: #30 (success)
- assets: 5/5 present and re-downloaded
- SHA256 verification: success
- published benchmark semantic verification: success

### GHCR

- image: `ghcr.io/ahmedsaturki/workproof-runtime:3.4.0-dev.2`
- digest: `sha256:2df71bf775272b9227979687de0c93d80f08814b83d7eb19e37e14dd63d8740b`
- immutable tag: `c1c1f378d0e79acfc4ee22d5d2ca3fa389e8402d`
- container verification run: #27 (success)
- OCI version/revision checks: success
- published-image `/health`: success
- anonymous GHCR pull: success

## Operational boundary

- [x] reproducible source archive
- [x] npm-compatible package artifact
- [x] GitHub Release publication
- [x] post-publication release verification
- [x] GHCR container publication
- [x] published image smoke
- [x] localhost-bound production compose
- [x] production deployment runbook
- [ ] public production host/DNS/TLS/auth/secrets provisioning

The unchecked line is deliberately external infrastructure, not a missing repository implementation.

## Verification rule

A successful tool response is a receipt, not proof. Work is verified only when independent evidence satisfies the Work Contract success criteria.
