# WorkProof Runtime Specification - v1.3-dev

## 1. Purpose

Represent a bounded digital outcome as a durable Work Object, execute it through explicit capabilities, safely handle external effects, independently verify outcomes, preserve portable proof, and manage proof lifecycle without deleting reachable evidence.

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

## 5. Verification and Evidence

A verifier receives the Work Object, success criterion, and known evidence and returns criterion-specific status, details, and evidence references.

Proof bundles identify the durable work, effects, artifacts, verification, and events. Canonical SHA-256 provides tamper-evident integrity. Ed25519 signatures can provide cryptographic authenticity under an embedded public key. Trust policy determines whether a signing identity is accepted.

## 6. Persistence

Work state, vault indexes, trust snapshots, and lifecycle metadata use atomic index updates where destructive recovery depends on authoritative metadata.

## 7. Proof Vault Lifecycle

The proof vault stores content-addressed proof files and artifacts.

Retention classes:
- ephemeral: eligible immediately unless protected or reachable.
- standard: 30 days from the managed object's lifecycle timestamp.
- long: 365 days.
- permanent: no expiry.

Explicit retention entries override the default class. Explicit pins create protected roots and may have an expiration. Namespace-scoped lifecycle operations are conservative: unscoped content is not deleted under a namespace filter.

## 8. Reachability

A retained proof is a root for every artifact reference stored in its vault index record. An explicitly retained or pinned artifact is independently a root.

Supplied registry trust-snapshot content is inventoried and protected in v1.3. The v1.3 vault GC does not destructively delete registry snapshot content.

## 9. Garbage Collection

Collection has two distinct phases:

1. Plan: inventory content, validate proof/artifact integrity, determine protected roots, compute reachability, classify candidates, and emit a dry-run plan.
2. Execute: persist a GC journal, update the authoritative proof index first, then delete verified candidates, audit each operation, and preserve a completion/partial journal for recovery.

Age alone is never sufficient. Corrupt or unverified proof/artifact content is not automatically deleted.

## 10. Repair

Repair removes stale proof records whose files are missing, removes stale artifact references to missing files, and recovers/removes a stale GC journal after the index has been reconciled.

## 11. CLI Lifecycle Surface

- vault-inventory
- vault-retain
- vault-pin
- vault-unpin
- vault-gc
- vault-repair

The default `vault-gc` operation is dry-run; destructive execution requires the explicit `--execute` flag.

## 12. Non-goals

WorkProof is not itself a generic agent framework, browser automation engine, workflow/queue product, memory database, observability backend, OSINT graph, distributed-consensus system, or hosted identity provider.

## 13. v1.3 Acceptance Target

- content inventory
- default and explicit retention classes
- protected pins
- proof-to-artifact reachability
- deterministic dry-run GC
- integrity-gated deletion
- namespace-conservative boundaries
- orphan detection and repair
- crash-safe journaled execution
- lifecycle audit events
- user-facing CLI commands
- green feature CI and green merged-main CI
