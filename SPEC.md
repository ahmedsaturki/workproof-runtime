# WorkProof Runtime Specification - v1.5-dev

## 1. Purpose

Represent a bounded digital outcome as a durable Work Object, execute it through explicit capabilities and worker ownership, safely handle external effects, independently verify outcomes, preserve portable proof, and manage proof lifecycle without deleting reachable evidence.

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
- busy ownership yields `waiting_lease` without executing the capability.
- long-running work renews ownership through a heartbeat.
- lease loss produces an unresolved outcome rather than false completion.
- graceful completion releases ownership.
- lease ownership does not replace external idempotency, reconciliation, or independent verification.

Lease authority implementations may be in-memory or persistent. Persistent cross-process authority uses transactional storage and durable lease identity/revision semantics.

## 6. Verification and Evidence

A verifier receives the Work Object, success criterion, and known evidence and returns criterion-specific status, details, and evidence references.

Proof bundles identify the durable work, effects, artifacts, verification, and events. Canonical SHA-256 provides tamper-evident integrity. Ed25519 signatures can provide cryptographic authenticity under an embedded public key. Trust policy determines whether a signing identity is accepted.

## 7. Persistence

Work state, lease state, worker registration, vault indexes, trust snapshots, and lifecycle metadata use authoritative persistence where recovery or ownership depends on durable state.

## 8. Proof Vault Lifecycle

The proof vault stores content-addressed proof files and artifacts.

Retention classes:
- ephemeral: eligible immediately unless protected or reachable.
- standard: 30 days from the managed object's lifecycle timestamp.
- long: 365 days.
- permanent: no expiry.

Explicit retention entries override the default class. Explicit pins create protected roots and may have an expiration. Namespace-scoped lifecycle operations are conservative: unscoped content is not deleted under a namespace filter.

## 9. Reachability and Garbage Collection

A retained proof is a root for every artifact reference stored in its vault index record. Explicitly retained or pinned artifacts are independently rooted.

Collection uses a plan phase and a journaled execute phase. Age alone is never sufficient for deletion. Corrupt or unverified proof/artifact content is not automatically deleted.

## 10. CLI Lifecycle Surface

The CLI exposes work execution, proof inspection/verification, signer identity, registry operations, and proof-vault lifecycle operations.

## 11. Non-goals

WorkProof is not itself a generic agent framework, browser automation engine, workflow/queue product, memory database, observability backend, OSINT graph, distributed-consensus system, or hosted identity provider.

## 12. v1.5 Acceptance Target

- persistent cross-process lease authority
- WorkEngine execution-lease binding
- busy ownership isolation
- heartbeat renewal
- lease-loss safety
- preservation of effect/recovery/verification semantics
- source audit
- dependency audit
- full integration suite
- benchmark/demo/CLI verification
- live GitHub smoke
- green feature CI and green merged-main CI
