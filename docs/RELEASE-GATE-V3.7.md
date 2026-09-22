# Release Gate v3.7 — v3.7.0-dev.1

Date: 2026-09-22

## Scope

Extend the verified WorkProof product with A2A interoperability and observational OTLP log export without creating alternate execution or proof authorities.

## Required acceptance

- [ ] A2A Agent Card and JSON-RPC endpoint
- [ ] A2A version negotiation
- [ ] authenticated Control Plane forwarding
- [ ] deterministic mutation idempotency
- [ ] A2A task state/artifact mapping
- [ ] A2A protocol acceptance
- [ ] packed A2A smoke
- [ ] OTLP/HTTP JSON log export
- [ ] telemetry field allowlist / non-leakage coverage
- [ ] broader mission composition example
- [ ] expanded Studio operational timeline
- [ ] source-tree/CI integration
- [ ] GitHub Release publication and post-publication verification
- [ ] GHCR publication and digest lineage
- [ ] production Compose pin
- [ ] main promotion and post-merge CI

## Stop conditions

Do not call v3.7 verified if A2A can bypass WorkProof authorization/execution, mutation can occur without an idempotency key, telemetry can be mistaken for proof, or packaged adapters differ from the tested source artifacts.
