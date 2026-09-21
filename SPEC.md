# WorkProof Runtime Specification - v1.9-dev

## 1. Purpose

Represent a bounded digital outcome as a durable Work Object, execute it through explicit capabilities and worker ownership, safely handle external effects, independently verify outcomes, preserve portable proof, manage proof lifecycle, and recover persisted execution after worker loss.

## 2. Core loop

GOAL -> CONTRACT -> ROUTE -> ACT -> OBSERVE -> VERIFY -> RECONCILE/RECOVER -> DELIVER -> PROVE -> RETAIN

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

## 4. Capability and Effect Contracts

Capabilities declare a stable name, version, supported operations, risk class, and executable behavior.

Effects track effect ID, idempotency key, operation, capability, risk class, attempts, attempt log, receipt/observed state, and lifecycle timestamps.

External writes may require approval. Ambiguous effects must be reconciled against external state before blind retry. A receipt is not independent proof of the final outcome.

## 5. Worker Ownership

An execution lease binds a WorkEngine step to an owner within a configured lease authority.

Lease behavior:
- acquisition occurs before capability execution.
- busy ownership yields waiting_lease without executing the capability.
- long-running work renews ownership through a heartbeat.
- lease loss produces an unresolved outcome rather than false completion.
- graceful completion releases ownership.
- lease ownership does not replace external idempotency, reconciliation, or independent verification.

Persistent cross-process authority uses transactional storage and durable lease identity/revision semantics.

## 6. Worker-Loss Recovery

Recoverable persisted work may be reloaded by a replacement worker through a recovery coordinator.

Recovery rules:
- only persisted work in running, waiting_lease, or unresolved states is eligible.
- expired execution leases may be reaped before a replacement owner attempts execution.
- a live lease remains authoritative and causes the replacement engine to return waiting_lease without invoking the capability.
- existing effect records and idempotency keys remain authoritative during resume.
- ambiguous external effects must reconcile against external state before a blind retry.
- ownership loss or stale-owner operations never establish verified success.

## 7. Saga Recovery

A persisted saga may be recovered independently of the original worker.

Recovery rules:
- a saga recovery lease is acquired before compensation execution.
- an unexpired live recovery lease causes the replacement worker to remain in waiting state.
- expired recovery ownership can be reaped and replaced by a new worker.
- verified compensation effects are never replayed.
- pending compensation effects are reconstructed from persisted operation, capability, input, risk, source-effect lineage, and idempotency identity.
- ambiguous compensation acknowledgements reconcile against external state before another write.
- if ownership moves during recovery, the stale worker stops before executing another compensation.
- the recovering worker persists saga state and lineage after every compensation attempt.

## 8. Verification and Evidence

A verifier receives the Work Object, success criterion, and known evidence and returns criterion-specific status, details, and evidence references.

Proof bundles identify the durable work, effects, artifacts, verification, and events. Canonical SHA-256 provides tamper-evident integrity. Ed25519 signatures can provide cryptographic authenticity under an embedded public key. Trust policy determines whether a signing identity is accepted.

## 9. Persistence

Work state, lease state, worker registration, vault indexes, trust snapshots, and lifecycle metadata use authoritative persistence where recovery or ownership depends on durable state.

## 10. Proof Vault Lifecycle

The proof vault stores content-addressed proof files and artifacts.

Retention classes:
- ephemeral: eligible immediately unless protected or reachable.
- standard: 30 days from the managed object's lifecycle timestamp.
- long: 365 days.
- permanent: no expiry.

Explicit retention entries override the default class. Explicit pins create protected roots and may have an expiration. Namespace-scoped lifecycle operations are conservative: unscoped content is not deleted under a namespace filter.

## 11. Reachability and Garbage Collection

A retained proof is a root for every artifact reference stored in its vault index record. Explicitly retained or pinned artifacts are independently rooted.

Collection uses a plan phase and a journaled execute phase. Age alone is never sufficient for deletion. Corrupt or unverified proof/artifact content is not automatically deleted.

## 12. CLI Lifecycle Surface

The CLI exposes work execution, proof inspection/verification, signer identity, registry operations, and proof-vault lifecycle operations.

## 13. Non-goals

WorkProof is not itself a generic agent framework, browser automation engine, workflow/queue product, memory database, observability backend, OSINT graph, or distributed-consensus system.

## 14. v1.9 Acceptance Target
- durable saga recovery after worker loss
- replacement ownership after expired recovery lease
- verified compensation not replayed
- pending compensation executes once in the controlled handoff path
- ambiguous compensation reconciliation before retry
- stale recovery worker cannot continue after lease ownership moves

- persisted recoverable Work Object discovery
- replacement-owner WorkEngine resume
- deterministic expired-lease recovery
- live-owner waiting_lease isolation
- ambiguous-effect reconciliation before blind replay
- stale-owner protection
- source audit
- dependency audit
- full integration suite
- benchmark/demo/CLI verification
- live GitHub smoke
- green feature CI and green merged-main CI
