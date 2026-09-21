# WorkProof Runtime Specification - v2.0-dev

## 1. Purpose

Represent a bounded digital outcome as durable work, execute it through explicit capabilities and worker ownership, safely handle external effects, independently verify outcomes, preserve portable proof, manage proof lifecycle, recover persisted execution after worker loss, and expose a user-facing local operational view.

## 2. Core loop

GOAL -> CONTRACT -> ROUTE -> ACT -> OBSERVE -> VERIFY -> RECONCILE/RECOVER -> DELIVER -> PROVE -> RETAIN -> CONTROL -> COMPENSATE

## 3. Work Contract

A Work Contract contains:
- objective
- inputs
- constraints
- success criteria
- deliverables
- risk class
- optional approval requirement

A step's risk class must not exceed the contract risk class.

## 4. Capability, Effect, Worker, and Saga Contracts

Capabilities declare stable names, versions, supported operations, risk classes, and executable behavior.

Effects track effect identity, idempotency, operation, capability, risk, attempts, receipts/observed state, and lifecycle timestamps.

Execution and recovery leases establish explicit worker ownership. Saga recovery uses a separate recovery lease and durable compensation lineage.

## 5. Verification and Evidence

Verification is criterion-specific and evidence-bearing. A receipt is not independent proof.

Proof bundles identify durable work, effects, artifacts, verification, and events. Canonical SHA-256 provides tamper-evident integrity. Ed25519 signatures can provide cryptographic authenticity under a trusted key policy.

## 6. Persistence and Retention

Work state, lease state, vault indexes, trust snapshots, retention metadata, and recovery lineage use authoritative persistence where correctness depends on durable state.

The proof vault is content-addressed and uses conservative reachability-aware retention and garbage collection.

## 7. Control Plane

Authenticated control-plane operations provide read, dispatch, cancel, and resume semantics. Authorization and audit remain separate from the Studio presentation layer.

## 8. Studio Foundation

The v2.0 Studio is a local, read-only operational surface over persisted Work Objects.

It provides:
- `GET /` HTML dashboard
- `GET /health` service health
- `GET /api/work` bounded Work Object summary listing
- `GET /api/work/:id` sanitized Work Object detail

Studio security rules:
- Work IDs are validated before repository access.
- Individual corrupt Work Objects do not break the summary list.
- Inputs, constraints, and raw effect receipts are omitted from the detail API.
- Browser hardening headers are emitted.
- No state-changing Studio endpoint exists in v2.0.

## 9. CLI Lifecycle Surface

The CLI exposes work execution, proof inspection/verification, signer identity, registry operations, proof-vault lifecycle, and local Studio launch.

## 10. Non-goals

WorkProof is not itself a generic agent framework, browser automation engine, workflow/queue product, memory database, observability backend, OSINT graph, or distributed-consensus system.

## 11. v2.0 Acceptance Target

- local Studio launch
- persisted Work Object listing
- sanitized Work Object detail
- HTML and API smoke verification
- no secrets/raw receipts exposed by Studio API
- source audit
- dependency audit
- full integration suite
- benchmark/demo/CLI verification
- live GitHub smoke
- green feature CI and green merged-main CI
