# WorkProof Runtime Specification - v3.0-dev

## 1. Purpose

Represent a bounded digital outcome as durable work, execute it through explicit capabilities and worker ownership, safely handle external effects, independently verify outcomes, preserve portable proof, manage proof lifecycle, recover persisted execution after worker loss, and expose a user-facing Studio with authenticated control delegation, proof/audit views, worker visibility, diagnostic lease visibility, and bounded operational filtering.

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

## 4. Capability, Effect, Worker, Lease, and Saga Contracts

Capabilities declare stable names, versions, supported operations, risk classes, and executable behavior.

Effects track effect identity, idempotency, operation, capability, risk, attempts, receipts/observed state, and lifecycle timestamps.

Workers expose bounded status including liveness and reassignment eligibility.

Execution and recovery leases establish explicit worker ownership. Saga recovery uses a separate recovery lease and durable compensation lineage.

## 5. Verification and Evidence

Verification is criterion-specific and evidence-bearing. A receipt is not independent proof.

Proof bundles identify durable work, effects, artifacts, verification, and events. Canonical SHA-256 provides tamper-evident integrity. Ed25519 signatures can provide cryptographic authenticity under a trusted key policy.

## 6. Persistence and Retention

Work state, lease state, vault indexes, trust snapshots, retention metadata, recovery lineage, and control idempotency records use authoritative persistence where correctness depends on durable state.

The proof vault is content-addressed and uses conservative reachability-aware retention and garbage collection.

## 7. Control Plane

Authenticated control-plane operations provide read, dispatch, cancel, resume, worker-status, and lease-status semantics. Authorization and audit remain separate from the Studio presentation layer.

The Studio control surface must delegate mutation to this control plane rather than reproducing authorization or state-transition logic.

## 8. Control Mutation Idempotency

When a durable idempotency ledger is configured, authenticated POST mutations use an Idempotency-Key with a canonical request fingerprint.

The ledger guarantees:
- same key + same operation/input returns the previously stored logical response without repeating the mutation;
- same key + different operation/input is rejected;
- concurrent duplicates are blocked while the first mutation is pending;
- completed entries survive process restart.

Control-plane idempotency is separate from external capability idempotency; it does not create exactly-once semantics for third-party systems.

## 9. Execution Fencing

An execution lease provides an ExecutionFence to the active capability.

The fence contains:
- resource identity
- current lease identity
- current revision
- an opaque leaseId:revision token
- an authoritative assertOwned() operation

WorkEngine asserts ownership before and after capability execution. Capability adapters may pass the token to an external system that supports conditional fencing.

## 10. Diagnostic Lease Visibility

The coordination layer provides a sanitized LeaseStatus projection for read-only diagnostics.

LeaseStatus contains:
- lease identity
- resource identity
- owner identity
- acquired timestamp
- renewed timestamp
- expiry timestamp
- revision
- active state

LeaseStatus must not contain an execution fencing token.

## 11. Operational Work Filtering

The Studio Work Object list supports:
- free-text query `q` against Work Object ID and objective, bounded to 200 characters
- exact `status` filtering over the bounded WorkStatus set
- exact `risk` filtering over the bounded RiskClass set
- positive safe-integer `limit` from 1 through MAX_WORKS

The `/api/work` response includes:
- `filters`
- `total`
- `byStatus`
- `byRisk`
- bounded `work[]`

Invalid filter values fail closed with HTTP 400. Matching results are sorted deterministically by updated timestamp and Work Object ID. The operation is read-only and has no mutation or authorization side effects.

## 12. Studio

Read surface:
- `GET /` HTML dashboard
- `GET /health` service health
- `GET /api/work` bounded/filterable Work Object listing
- `GET /api/work/:id` sanitized Work Object detail
- `GET /api/workers` worker/liveness projection
- `GET /api/leases` diagnostic execution lease projection
- `GET /api/proofs?workId=:id` retained proof summaries
- `GET /api/proof/:digest` retained proof audit detail

The dashboard provides operational search/filter controls and summary cards derived from the filtered Work Object set.

Optional control surface:
- `POST /api/control/dispatch` -> authenticated control-plane dispatch
- `POST /api/control/work/:id/cancel` -> authenticated control-plane cancel
- `POST /api/control/work/:id/resume` -> authenticated control-plane resume

## 13. CLI Lifecycle Surface

The CLI exposes work execution, proof inspection/verification, signer identity, registry operations, proof-vault lifecycle, and local Studio launch.

## 14. Non-goals

WorkProof is not itself a generic agent framework, browser automation engine, workflow/queue product, memory database, observability backend, OSINT graph, or distributed-consensus system.

## 15. Operational Health Projection

- v2.8 behavior remains passing.
- bounded search, status, risk, and limit filters are available on `/api/work`.
- operational summary counts are deterministic for the filtered set.
- invalid filter inputs fail closed with 400.
- query length is bounded.
- result ordering is deterministic.
- Studio renders filter controls and summary cards.
- filtering does not mutate work, leases, proofs, or control state.
- source audit
- dependency audit
- full integration suite
- benchmark/demo/CLI verification
- live GitHub smoke
- green feature CI and green merged-main CI


## 16. v3.0 Acceptance Target

- v2.9 behavior remains passing
- GET /api/operations/overview is bounded and deterministic
- effect and verification health are evidence-derived from valid persisted Work Objects
- optional worker and lease health never fabricates state
- attention reason codes are explicit and deterministic
- Studio renders operational health cards and an attention queue
- projection is read-only and does not change execution, authorization, lease ownership, proof state, or control state
- source audit, dependency audit, full integration suite, benchmark, demo, CLI verification, live GitHub smoke
- green feature CI and green merged-main CI
