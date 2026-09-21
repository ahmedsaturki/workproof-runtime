# WorkProof Runtime

Outcome-first digital work runtime: execute real work, reconcile external effects, verify outcomes, and preserve proof.

## Current status

**v1.3-dev retention, reachability, and garbage-collection hardening is in progress.**

The current main line has verified proof integrity, cryptographic identity, trusted signer policy, authenticated registry transport, signed trust snapshots, and auditable trust-state transitions. The active v1.3 branch extends the self-hosted proof vault with explicit retention classes, protected pins, reachability-based collection, namespace-conservative GC, integrity-gated deletion, and crash-safe repair.

## Core loop

Goal -> Outcome Contract -> Capability -> Execute -> Observe/Reconcile -> Verify -> Recover/Substitute -> Deliver -> Proof -> Retain

## Verified v1.2 foundation

- Versioned signed trust-policy snapshots.
- Explicit trusted administrative signer identities.
- Namespace-scoped signer authorization.
- Authenticated registry trust transport.
- Client-side snapshot digest/signature validation.
- Revocation propagation.
- Persistent snapshot index and audit history.

## v1.3 retention and GC

- Content inventory for proof, artifact, and supplied trust-snapshot objects.
- Default retention classes: ephemeral, standard, long, permanent.
- Explicit proof/artifact/snapshot retention overrides.
- Protected pins with optional expiry.
- Reachability from retained proofs to their artifacts.
- Deterministic dry-run garbage-collection plans.
- Integrity verification is required before a proof/artifact becomes deletable.
- Namespace-scoped collection is conservative and does not delete unscoped content.
- Index-first GC journal prevents a crash from leaving authoritative metadata pointing at newly deleted proofs.
- Orphan detection and repair of missing proof/artifact references.
- Audit events for retention and destructive lifecycle operations.

## CLI lifecycle

- `workctl vault-inventory <vault-dir>`
- `workctl vault-retain <digest> <vault-dir> <ephemeral|standard|long|permanent> [namespace]`
- `workctl vault-pin <digest> <vault-dir> [reason] [namespace] [expiresAt]`
- `workctl vault-unpin <digest> <vault-dir>`
- `workctl vault-gc <vault-dir>` produces a dry-run plan.
- `workctl vault-gc <vault-dir> --execute` applies the same verified plan.
- `workctl vault-gc <vault-dir> --namespace <name>` scopes collection conservatively.
- `workctl vault-repair <vault-dir>` reconciles stale index references and stale GC journals.

## Safety boundary

Garbage collection never treats age alone as sufficient evidence for deletion. Protected roots, explicit retention, reachability, namespace scope, and content integrity are evaluated before a proof or artifact becomes deletable.

Trust snapshots are inventoried as protected external content in v1.3; destructive lifecycle management of distributed registry objects remains a separate registry-level milestone.

This repository does not make a global novelty claim.
