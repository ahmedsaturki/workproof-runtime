# WorkProof Runtime

Outcome-first digital work runtime: execute real work, reconcile external effects, verify outcomes, and preserve proof.

## Current status

**v0.5-dev integration milestone is verified on main.**

The runtime now has a real third-party read integration plus a controlled external-write path, with approval, reconciliation, independent verification, proof integrity, cross-system fault injection, and persisted-effect resume protection.

## Core loop

Goal -> Outcome Contract -> Capability -> Execute -> Observe/Reconcile -> Verify -> Recover/Substitute -> Deliver -> Proof

## Verified v0.5 scope

- GitHub REST repository read + independent verifier.
- GitHub issue creation declared as external_write.
- Human approval enforced before external-write execution.
- Deterministic idempotency marker with pre-write reconciliation.
- Lost-acknowledgement test proves one POST produces one issue.
- Two independent external systems reconcile ambiguous writes without duplicate writes.
- Persisted acknowledged effects are skipped on resume instead of being re-executed.
- Proof bundles support canonical SHA-256 integrity verification.
- GitHub pack compatibility is declared and tested.
- GitHub inputs are validated before network access.

## CI evidence

Main run #34 passed the complete verification pipeline: source-tree audit, strict TypeScript build, 28/28 tests, benchmark, demo, CLI proof/mission, and live read-only GitHub smoke.

## Safety boundary

A capability receipt is not proof of the final outcome. External side effects require independent state verification or reconciliation.

GitHub issue idempotency is deliberately marker/reconciliation-based. It must not be described as an atomic exactly-once guarantee across concurrent workers.

SHA-256 integrity is tamper-evident metadata, not a cryptographic signature.

## Product boundary

WorkProof Runtime is not a replacement for agents, browsers, workflow engines, MCP registries, memory systems, or observability platforms. Those systems can be integrated as adapters while the Work Object, effect, verification, recovery, and proof semantics remain invariant.

## Next engineering gates

General compensation/saga primitives, environment-permitted external browser navigation, worker/process boundaries, remote control-plane/API/SDK surfaces, and a user-facing Studio remain separate milestones.

This repository does not make a global novelty claim.
