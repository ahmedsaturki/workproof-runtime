# WorkProof Runtime Specification - v2.2-dev

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

Work state, lease state, vault indexes, trust snapshots, retention metadata, and recovery lineage use authoritative persistence where correctness depends on durable state.

The proof vault is content-addressed and uses conservative reachability-aware retention and garbage collection.

## 7. Control Plane

Authenticated control-plane operations provide read, dispatch, cancel, and resume semantics. Authorization and audit remain separate from the Studio presentation layer.

The Studio control surface must delegate mutation to this control plane rather than reproducing authorization or state-transition logic.

## 8. Control mutation idempotency

When a durable idempotency ledger is configured, authenticated `POST` mutations use an `Idempotency-Key` with a canonical request fingerprint.

The ledger guarantees:
- same key + same operation/input returns the previously stored logical response without repeating the mutation;
- same key + different operation/input is rejected;
- a concurrent duplicate sees an explicit in-progress state rather than executing a second mutation;
- completed entries survive process restart.

A pending entry is fail-closed rather than automatically reclaimed, because retrying an unknown mutation can itself create a duplicate side effect.

Control-plane idempotency is separate from external capability idempotency; it does not create exactly-once semantics for third-party systems.

## 9. Studio

The v2.1 Studio is a local operational surface over persisted Work Objects with optional authenticated control delegation.

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

Studio control security rules:
- Work IDs are validated before constructing control-plane routes.
- The Studio requires a valid bearer header before forwarding.
- No bearer token is logged or returned.
- Control-plane authorization is authoritative.
- Successful control responses are sanitized through the same Studio Work Object projection.
- No local mutation occurs when the control plane is absent.
- State-changing Studio operations preserve the control-plane request ID and audit semantics.

Proof/audit security rules:
- Proof digests are validated as lowercase SHA-256 values.
- Vault filesystem paths are never returned.
- Integrity and signature validity are recomputed from retained proof material.
- Trust state is evaluated against an optional local trust policy.
- Corrupted retained proofs are reported as invalid instead of being treated as valid.
- Proof APIs never mutate the vault.
- Browser hardening and no-store headers apply to the proof/audit surface.

## 10. CLI Lifecycle Surface

The CLI exposes work execution, proof inspection/verification, signer identity, registry operations, proof-vault lifecycle, and local Studio launch.

## 11. Non-goals

WorkProof is not itself a generic agent framework, browser automation engine, workflow/queue product, memory database, observability backend, OSINT graph, or distributed-consensus system.

## 12. v2.2 Acceptance Target

- v2.0 Studio behavior remains passing.
- Authenticated dispatch delegation works.
- Authenticated cancel delegation works.
- Authenticated resume delegation works.
- Missing credentials are rejected.
- Read-only credentials cannot perform Studio mutations.
- Control responses do not leak sensitive Work Object fields.
- Control-plane audit entries remain authoritative.
- Retained proof summaries and audit detail are read-only and sanitized.
- Source audit
- dependency audit
- full integration suite
- benchmark/demo/CLI verification
- live GitHub smoke
- green feature CI and green merged-main CI
