# WorkProof Runtime

Outcome-first digital work runtime: execute real work, reconcile external effects, verify outcomes, and preserve proof.

## Development status

The v0.5-dev integration branch is being hardened on top of the verified v0.4 baseline.

The stable main baseline remains the verified v0.4 development kernel. The branch feature/v0.5-github-integration adds the first live third-party integration and the controlled external-write path.

## Core loop

Goal -> Outcome Contract -> Capability -> Execute -> Observe/Reconcile -> Verify -> Recover/Substitute -> Deliver -> Proof

## Current v0.5 work

- GitHub REST repository read capability
- independent GitHub repository verifier
- GitHub issue creation capability with explicit external_write risk
- deterministic idempotency markers for issue creation
- local lost-acknowledgement GitHub-shaped fault injection
- proof-bundle SHA-256 integrity manifest
- pack compatibility manifest
- effect operation context

## Verified baseline

The v0.4 baseline previously passed 22/22 automated tests, benchmark and demo checks, CLI proof verification, controlled Chromium/CDP acceptance, HTTP/publication reconciliation, capability substitution, risk/approval enforcement, and persistence/reload.

## Safety rule

A capability response is a receipt, not proof of the final outcome. External side effects require independent state verification or reconciliation.

## Product boundary

WorkProof Runtime is not a replacement for agents, browsers, workflow engines, MCP registries, memory systems, or observability platforms. Those may be connected through adapters while the Work Object, effect, verification, recovery, and proof semantics remain invariant.

## Roadmap

Next engineering gates are two-system fault injection, broader external verifiers, stronger artifact lineage, worker boundaries, and user-facing Studio/API surfaces.

This repository does not make a global novelty claim.
