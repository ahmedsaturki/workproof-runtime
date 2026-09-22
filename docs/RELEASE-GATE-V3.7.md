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
- [ ] GitHub Release publication and post-publication verification
- [ ] GHCR publication and digest lineage
- [ ] production Compose pin
- [ ] main promotion and post-merge CI

## Stop conditions

Do not call v3.7 verified if A2A can bypass WorkProof authorization/execution, mutation can occur without an idempotency key, telemetry can be mistaken for proof, or packaged adapters differ from the tested source artifacts.


## Candidate verification

- [x] Feature CI #1179 passed on commit `197a2598d3d338bd15b9a8b7678fce090fa689f9`
- [x] TypeScript build and packed artifact verification passed
- [x] Full unit/integration suite passed, including A2A and OTLP tests
- [x] Benchmark, demo, CLI proof, representative missions, and live GitHub smoke passed
- [x] Source-tree gate reports 213 required files with no missing entries

Publication and main promotion remain intentionally open until the exact release branch artifacts are generated and independently rechecked.
