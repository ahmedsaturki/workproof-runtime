# WorkProof Runtime

Outcome-first digital work runtime: execute real work, reconcile external effects, verify outcomes, and preserve proof.

## Current status

**v1.2-dev signed trust-policy synchronization is verified on main.**

The runtime now separates proof integrity, cryptographic identity, trust policy, authenticated registry access, signed trust snapshots, namespace-scoped administrative signer authorization, and auditable state transitions.

## Core loop

Goal -> Outcome Contract -> Capability -> Execute -> Observe/Reconcile -> Verify -> Recover/Substitute -> Deliver -> Proof

## Verified v1.2 scope

- Versioned trust-policy snapshots with canonical SHA-256 digests.
- Ed25519 administrative signatures with explicit trusted signer identities.
- Deterministic accept/noop/conflict/rollback reconciliation by epoch.
- Authenticated registry trust publish/pull/list/current/apply transport.
- Namespace-scoped administrative signer trust.
- Client-side trust snapshot digest/signature verification after transport.
- Revocation state propagation through signed snapshots.
- Logical content-addressed snapshot paths without absolute filesystem disclosure.
- Persistent trust snapshot index and audit event history.
- Dependency/security audit and full CI verification.

## Security boundary

Registry authentication answers who may call protected registry endpoints.
Proof signatures answer which key signed a proof.
Trust policy answers which proof identities are accepted.
Trust snapshots answer whether one trust-policy state may replace another.
Administrative signer authorization is namespace-aware when namespaces are configured.

The runtime does not claim distributed consensus merely from signed snapshot replication.

## Next engineering gate

**v1.3 retention, reachability, and garbage collection**: content inventory, protected roots, retention classes, dry-run deletion, orphan detection/repair, namespace-aware boundaries, and crash-safe lifecycle management.

This repository does not make a global novelty claim.
