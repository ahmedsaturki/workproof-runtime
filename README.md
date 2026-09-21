# WorkProof Runtime

Outcome-first digital work runtime: execute real work, reconcile external effects, verify outcomes, and preserve proof.

## Current status

**v1.0-dev self-hosted proof registry is in progress.**

The proof boundary now has four separable concerns:
1. deterministic SHA-256 integrity,
2. Ed25519 cryptographic signature,
3. explicit trust policy,
4. durable content-addressed retention.

The active v1.0 branch adds a self-hosted HTTP registry over the local proof vault so proofs can move between processes or machines without requiring a managed service.

## Core loop

Goal -> Outcome Contract -> Capability -> Execute -> Observe/Reconcile -> Verify -> Recover/Substitute -> Deliver -> Proof

## v0.9 proof vault

- Content-addressed proof storage by SHA-256 digest.
- Atomic proof/index writes.
- Local artifact retention by SHA-256 content digest.
- Idempotent duplicate publication.
- Integrity validation before publication and restore.
- Corrupt proof/artifact detection.
- Path confinement.
- CLI publish/list/inspect/restore lifecycle.

## v1.0 self-hosted proof registry

- `npm run registry-server -- <vault-dir> [port] [host]` starts the registry.
- `GET /health` exposes protocol health/version.
- `POST /v1/proofs` publishes a verified proof.
- `GET /v1/proofs` lists retained records.
- `GET /v1/proofs/<digest>` returns record plus verified proof.
- `GET /v1/proofs/<digest>/content` returns verified proof content.
- Invalid JSON is rejected before storage.
- Invalid-integrity proofs are rejected before storage.
- Retained proof integrity is re-verified before egress.
- Duplicate publication remains content-addressed and idempotent.

## Safety boundary

A capability receipt is not proof of the final outcome. External side effects require independent state verification or reconciliation.

The registry is a transport/durability layer, not a trust authority. Integrity, cryptographic signature validity, and trust policy remain separate acceptance gates.

## Product boundary

WorkProof Runtime is not a replacement for agents, browsers, workflow engines, MCP registries, memory systems, or observability platforms. Those systems can be integrated as adapters while the Work Object, effect, verification, recovery, and proof semantics remain invariant.

This repository does not make a global novelty claim.
