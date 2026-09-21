# WorkProof Runtime Specification - v2.8-dev

## 1. Purpose

Represent a bounded digital outcome as durable work, execute it through explicit capabilities and worker ownership, safely handle external effects, independently verify outcomes, preserve portable proof, manage proof lifecycle, recover persisted execution after worker loss, and expose a user-facing Studio with authenticated control delegation, read-only proof/audit views, worker visibility, and diagnostic lease visibility.

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

The in-memory LeaseStore and persistent LeaseStore expose the same projection contract.

The authenticated control plane exposes `GET /v1/leases`. If no lease source is configured it returns HTTP 503.

Studio exposes `GET /api/leases`. In local mode it reads the configured lease source directly. In remote mode it delegates through the authenticated control plane and re-sanitizes the returned leases.

Lease visibility is diagnostic only and cannot acquire, renew, release, reassign, or otherwise mutate lease ownership.

## 11. Studio

Read surface:
- `GET /` HTML dashboard
- `GET /health` service health
- `GET /api/work` bounded Work Object summary listing
- `GET /api/work/:id` sanitized Work Object detail
- `GET /api/workers` worker/liveness projection
- `GET /api/leases` diagnostic execution lease projection
- `GET /api/proofs?workId=:id` retained proof summaries
- `GET /api/proof/:digest` retained proof audit detail

Optional control surface:
- `POST /api/control/dispatch` -> authenticated control-plane dispatch
- `POST /api/control/work/:id/cancel` -> authenticated control-plane cancel
- `POST /api/control/work/:id/resume` -> authenticated control-plane resume

Studio preserves the control-plane idempotency header when proxying replay responses, and its browser actions generate per-action keys.

## 12. CLI Lifecycle Surface

The CLI exposes work execution, proof inspection/verification, signer identity, registry operations, proof-vault lifecycle, and local Studio launch.

## 13. Non-goals

WorkProof is not itself a generic agent framework, browser automation engine, workflow/queue product, memory database, observability backend, OSINT graph, or distributed-consensus system.

## 14. v2.8 Acceptance Target

- v2.7 behavior remains passing.
- read-only control-plane lease visibility is available when configured.
- lease visibility requires authentication when routed remotely.
- local Studio exposes lease status when configured.
- remote Studio delegates lease visibility through the authenticated control plane.
- the Studio re-sanitizes the remote response.
- PersistentLeaseStore and LeaseStore provide the same visibility contract.
- fencing tokens never cross the read-only visibility boundary.
- missing sources fail closed with 503.
- lease visibility routes do not mutate lease state.
- source audit
- dependency audit
- full integration suite
- benchmark/demo/CLI verification
- live GitHub smoke
- green feature CI and green merged-main CI
