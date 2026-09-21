# WorkProof Runtime

Outcome-first digital work runtime: execute real work, reconcile external effects, verify outcomes, and preserve proof.

## Current status

**v1.0-dev self-hosted proof registry is verified on main.**

The proof boundary is built as separable layers:
1. deterministic SHA-256 integrity,
2. Ed25519 cryptographic signature,
3. explicit trust policy,
4. durable content-addressed retention,
5. self-hosted registry transport.

## Core loop

Goal -> Outcome Contract -> Capability -> Execute -> Observe/Reconcile -> Verify -> Recover/Substitute -> Deliver -> Proof

## Verified v1.0 self-hosted registry

- The registry server runs locally over the existing content-addressed vault.
- The server exposes health, list, publish, metadata, and content endpoints.
- The client refuses proofs whose local integrity does not verify.
- The client independently verifies the requested digest after retrieval.
- Invalid-integrity submissions are rejected before retention.
- Retained proof integrity is re-verified before egress.
- Duplicate publication is content-addressed and idempotent.
- Malformed JSON and corrupt retained proofs are rejected.

## Verification status

The merged-main v1.0 pipeline passed:
- source audit: 75/75 required paths,
- automated tests: 55/55,
- benchmark,
- demo,
- CLI proof verification and mission execution,
- browser/HTTP/publication/recovery integration,
- live GitHub repository smoke.

## Safety boundary

A capability receipt is not proof of the final outcome. External side effects require independent state verification or reconciliation.

The registry is a transport/durability layer, not a trust authority. Integrity, signature validity, and trust policy remain separate acceptance gates.

## Next engineering gate

v1.1 authenticated multi-user registry and trust synchronization.

This repository does not make a global novelty claim.