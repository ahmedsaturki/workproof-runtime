# Release Gate v3.7 — v3.7.0-dev.1

Date: 2026-09-22

## Scope

Extend the verified WorkProof product with A2A interoperability and observational OTLP log export without creating alternate execution or proof authorities.

## Required acceptance

- [x] A2A Agent Card and JSON-RPC endpoint
- [x] A2A version negotiation
- [x] authenticated Control Plane forwarding
- [x] deterministic mutation idempotency
- [x] A2A task state/artifact mapping
- [x] A2A protocol acceptance
- [x] packed A2A smoke
- [x] OTLP/HTTP JSON log export
- [x] telemetry field allowlist / non-leakage coverage
- [x] broader mission composition example
- [x] expanded Studio operational timeline
- [x] source-tree/CI integration
- [x] GitHub Release publication and post-publication verification
- [x] GHCR publication and digest lineage
- [x] production Compose pin
- [x] main promotion and post-merge CI

## Stop conditions

Do not call v3.7 verified if A2A can bypass WorkProof authorization/execution, mutation can occur without an idempotency key, telemetry can be mistaken for proof, or packaged adapters differ from the tested source artifacts.


## Candidate verification

- [x] Feature CI #1179 passed on commit `197a2598d3d338bd15b9a8b7678fce090fa689f9`
- [x] TypeScript build and packed artifact verification passed
- [x] Full unit/integration suite passed, including A2A and OTLP tests
- [x] Benchmark, demo, CLI proof, representative missions, and live GitHub smoke passed
- [x] Source-tree gate reports 213 required files with no missing entries

Publication and main promotion remain intentionally open until the exact release branch artifacts are generated and independently rechecked.


## Published evidence

- GitHub Release: `v3.7.0-dev.1` (ID 393526164)
- Release target: `f776ed9f5fcbb055f7da41ca69714c19b20f9aad`
- Release workflow #171: success
- Container workflow #168: success
- GHCR digest: `sha256:28e8d9af0ab71442b33df8b72308089f520b5ba23128401c0a05675809ba1748`
- Immutable GHCR tag: `f776ed9f5fcbb055f7da41ca69714c19b20f9aad`
- Five release assets: published and post-publication verification succeeded
- Container runtime health: verified
- Production Compose restart/persistence: verified
- Disposable external topology: verified
- Anonymous GHCR pull: verified
- Release/container digest lineage: verified
- Rollback target: `v3.6.0-dev.1` / `sha256:2c5ba1b58697ec545cf7098d93e8750394b9b1e2ccd9e8f45b647cec689bd247`

## Main promotion status

- [x] Final release metadata reconciled on promotion branch
- [x] Production Compose pinned to the published v3.7 digest
- [x] Main promotion PR is the remaining integration step
