# Product Readiness V1 — Local-First Digital Work Operator

Date: 2026-09-22

## Purpose

This document is the acceptance contract for the WorkProof Runtime product. It distinguishes executable evidence from architectural intent and does not treat a green build alone as production readiness.

The product target is a **local-first Digital Work Operator**. The kernel remains the invariant substrate; product surfaces must not weaken outcome contracts, independent verification, reconciliation, recovery, proof, or risk controls.

## Product promise

A user gives the operator a bounded digital outcome. The system turns that outcome into durable work, executes through explicit capabilities, observes and reconciles side effects, independently verifies the requested outcome, recovers or substitutes when safe, and delivers portable proof/evidence.

The default deployment is local/self-hosted. Remote infrastructure is an optional topology, not a runtime dependency of the core product.

## Product surfaces

### P0 — Complete

- Local CLI for mission execution, proof inspection, verification, signer/trust operations, and vault lifecycle.
- Local Studio for work state, execution, workers, leases, proof/audit, and bounded control.
- Local persistent work/proof storage.
- Deterministic capability/pack manifests.
- Reproducible source and container distributions.
- Health/readiness behavior suitable for local supervision.
- Exportable mission artifacts and evidence.

### P1 — Implemented extension points

- REST/Control Plane API with authenticated mutation and idempotency semantics.
- Worker runtime with persistent ownership/recovery and fencing.
- Pack registry and compatibility metadata.
- SDK surface around Work Objects and capability contracts.
- CI verification integration.

### P2 — Implemented interoperability adapters

- MCP v2 stdio adapter with authenticated Control Plane forwarding and explicit mutation idempotency.
- A2A 1.0 JSON-RPC adapter with Agent Card, task lifecycle, filtering/paging, authentication, and idempotency.
- Dependency-free OTLP/HTTP JSON audit export with bounded field allowlisting.

Adapters are interoperability layers only. WorkProof remains authoritative for execution, risk policy, effects, verification, reconciliation, recovery, and proof.

## Local-first contract

1. Core execution works without a public hostname, DNS, TLS certificate, cloud database, SaaS control plane, or third-party hosted UI.
2. Persistent state has an explicit local filesystem/storage location.
3. Local administrative surfaces bind to localhost by default.
4. External side effects remain explicit capabilities subject to risk/policy controls.
5. Proof remains portable and independently verifiable outside Studio.
6. A lost worker/process cannot silently convert incomplete work into success.
7. Remote deployment is an alternate topology over the same contracts, not a separate semantic implementation.

## External-production readiness contract

The repository's disposable external-topology gate now verifies the technical topology contract: TLS termination, authentication, secret non-leakage, persistent storage, backup/restore, health, resource limits, restart behavior, rollback to a previously verified immutable release, and deny-by-default network exposure.

A **public production host is not claimed as provisioned**. Public host/DNS/certificate/secret/control-plane infrastructure remains an external deployment-resource boundary and must be supplied by the operator of the target environment.

## Current verified baseline — v3.8.8

The current stable product baseline is **v3.8.8**.

- GitHub Release ID: `394017508`
- release commit: `9f5c04505d0396312eb1b44fa08d5e2f8dd1aebd`
- Release workflow #239: success
- Container workflow #236: success
- GHCR digest: `sha256:0c31c571480d45d5f46f5ae6f8b8a4b1328094a7561f76aee7016c99e586eb10`
- immutable image tag: `bcf951fdf772ae8aa843671e3bf7ae1ba765471b`
- immutable image tag: `9f5c04505d0396312eb1b44fa08d5e2f8dd1aebd`
- rollback: v3.8.1

The v3.8.8 distribution additionally enforces an immutable Node 24.21.0 Trixie slim base digest and a bounded production resource/log envelope.

## Release acceptance gates

| Gate | v3.8.8 evidence |
| --- | --- |
| Build | CI/Release/Container builds succeed from clean checkout |
| Tests | Full unit/integration suite succeeds |
| Benchmark | M001-M005 5/5; false-done and duplicate-effect metrics are zero |
| Failure recovery | ambiguity, restart/resume, leases, idempotency, and substitution are covered |
| Security | audit, secret scan, least-privilege/network-boundary and negative authorization gates |
| Distribution | five GitHub Release assets and SHA256 verification |
| Local install | packed CLI/control-plane/MCP/A2A smoke |
| Persistence | Compose restart/persistence smoke |
| External topology | TLS/auth/secret non-leakage/backup/restore/rollback/deny-by-default smoke |
| Documentation | README, STATUS, source manifest, deployment and container runbooks reconciled |

## Current product state

The local-first P0/P1 product gate is executable and verified:

- [x] package install and representative mission smoke
- [x] persistent restart/resume acceptance
- [x] idempotency operation/input drift protection
- [x] portable proof export/verify/import
- [x] versioned proof compatibility
- [x] operator guidance for failure, ambiguity, recovery, and verification states
- [x] operational overview and attention summary
- [x] production Compose restart/persistence smoke
- [x] production Compose resource/log envelope smoke
- [x] package distribution includes operator docs and representative mission examples
- [x] MCP v2 interoperability and packed-package smoke
- [x] A2A 1.0 interoperability and packed artifact smoke
- [x] OTLP/HTTP JSON audit export with bounded field allowlist
- [x] authenticated capability inventory and Studio registry visibility
- [x] Control Plane execution-policy enforcement
- [x] terminal failed-idempotency replay safety
- [x] Studio loopback network boundary
- [x] Registry non-loopback authentication boundary
- [x] immutable container-base provenance
- [x] bounded production resource/log envelope

## Benchmark evidence

M001-M005: 5/5 verified.

- verifiedCompletionRate: 1.0
- falseDoneCount: 0
- duplicateExternalEffectCount: 0
- ambiguousOutcomeResolvedCount: 1
- capabilitySubstitutionCount: 1
- evidenceCompleteRate: 1.0
- humanInterventionCount: 0

## Stop conditions

Do not claim completion if any of these are true:

- a capability receipt is being treated as proof;
- ambiguous external effects can be retried blindly;
- an older worker can cross a fenced execution boundary;
- unauthenticated mutation can change authoritative state;
- local restart loses authoritative work/proof state;
- published artifacts cannot be independently verified;
- the UI claims an outcome that the independent verifier did not establish.

## Product boundary

WorkProof Runtime is not required to become a generic agent framework, browser automation product, workflow engine, memory database, observability backend, or OSINT graph. Those systems may integrate as capabilities/adapters. The durable Work Object, outcome contract, effect, verification, recovery, and proof semantics remain the invariant boundary.

## Historical provenance

v3.8.7 was the preceding verified stable distribution. v3.8.2 is retained as superseded release history and is not a rollback target. v3.8.1 remains the verified rollback release.
