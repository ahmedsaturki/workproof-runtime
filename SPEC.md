# WorkProof Runtime Specification - v2.4-dev

## 1. Purpose

Represent a bounded digital outcome as durable work, execute it through explicit capabilities and worker ownership, safely handle external effects, independently verify outcomes, preserve portable proof, manage proof lifecycle, recover persisted execution after worker loss, and expose a user-facing Studio with authenticated control delegation and read-only proof/audit views.

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

Work state, lease state, vault indexes, trust snapshots, retention metadata, recovery lineage, and control idempotency records use authoritative persistence where correctness depends on durable state.

The proof vault is content-addressed and uses conservative reachability-aware retention and garbage collection.

## 7. Control Plane

Authenticated control-plane operations provide read, dispatch, cancel, and resume semantics. Authorization and audit remain separate from the Studio presentation layer.

The Studio control surface must delegate mutation to this control plane rather than reproducing authorization or state-transition logic.

## 8. Control mutation idempotency

When a durable idempotency ledger is configured, authenticated POST mutations use an Idempotency-Key with a canonical request fingerprint.

The ledger guarantees:
- same key + same operation/input returns the previously stored logical response without repeating the mutation;
- same key + different operation/input is rejected;
- a concurrent duplicate sees an explicit in-progress state rather than executing a second mutation;
- completed entries survive process restart.

A pending entry is fail-closed rather than automatically reclaimed, because retrying an unknown mutation can itself create a duplicate side effect.

Invalid keys are rejected at the control-plane boundary. Idempotency records contain the logical operation, request fingerprint, response, request ID, and timestamps.

Control-plane idempotency is separate from external capability idempotency; it does not create exactly-once semantics for third-party systems.

## 9. Execution fencing

An execution lease provides an `ExecutionFence` to the active capability.

The fence contains:
- resource identity
- current lease identity
- current revision
- an opaque `leaseId:revision` token
- an authoritative `assertOwned()` operation

The token is dynamic across lease renewals while retaining the same lease identity. A takeover changes lease identity, causing the old fence assertion to fail.

WorkEngine asserts the fence immediately before capability execution and again after execution. A post-execution fence failure converts the step to an unresolved state requiring reconciliation rather than silently accepting stale-worker work.

Capability adapters may pass the token to an external system that supports conditional fencing. The runtime does not claim universal protection for systems that ignore the token.

## 10. Studio

The v2.3 Studio remains a local operational surface over persisted Work Objects with optional authenticated control delegation.

Read surface:
- `GET /` HTML dashboard
- `GET /health` service health
- `GET /api/work` bounded Work Object summary listing
- `GET /api/work/:id` sanitized Work Object detail
- `GET /api/proofs?workId=:id` retained proof summaries
- `GET /api/proof/:digest` retained proof audit detail

Optional control surface:
- `POST /api/control/dispatch` -> authenticated control-plane dispatch
- `POST /api/control/work/:id/cancel` -> authenticated control-plane cancel
- `POST /api/control/work/:id/resume` -> authenticated control-plane resume

Studio preserves the control-plane idempotency header when proxying replay responses, and its browser actions generate per-action keys.

## 11. CLI Lifecycle Surface

The CLI exposes work execution, proof inspection/verification, signer identity, registry operations, proof-vault lifecycle, and local Studio launch.

## 12. Non-goals

WorkProof is not itself a generic agent framework, browser automation engine, workflow/queue product, memory database, observability backend, OSINT graph, or distributed-consensus system.

## 13. v2.4 Acceptance Target

- v2.2 behavior remains passing.
- durable control mutation idempotency is enabled and tested.
- same-key replay does not repeat a successful mutation.
- same-key logical conflicts are rejected.
- concurrent duplicates are blocked while the first mutation is pending.
- completed idempotency entries survive process restart.
- invalid idempotency keys are rejected.
- SDK idempotency propagation works.
- Studio idempotency propagation and replay headers work.
- source audit
- dependency audit
- full integration suite
- benchmark/demo/CLI verification
- live GitHub smoke
- multi-process stale-worker fencing regression
- green feature CI and green merged-main CI
