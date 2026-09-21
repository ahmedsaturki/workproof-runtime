# WorkProof Runtime

Outcome-first digital work runtime: execute real work, reconcile external effects, verify outcomes, and preserve proof.

## Current status

**v0.6-dev proof CLI hardening is in progress.**

The active branch, `feature/v0.6-proof-cli`, promotes proof integrity into the user-facing CLI: generated proof files carry a SHA-256 integrity manifest and `workctl verify` validates it, including explicit tamper detection and manifest metadata checks.

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

## v0.6 proof CLI

- `workctl run` emits an integrity manifest with the proof.
- `workctl verify` validates the manifest when present.
- Integrity metadata is checked for version, algorithm, work identity, and digest shape.
- Tampered proof content returns an integrity-specific failure.
- Legacy proofs without an integrity manifest remain readable.

## CI evidence

The merged v0.5 main checkpoint passed the complete verification pipeline, including 28/28 automated tests and live read-only GitHub smoke.

## Safety boundary

A capability receipt is not proof of the final outcome. External side effects require independent state verification or reconciliation.

GitHub issue idempotency is marker/reconciliation-based and is not an atomic exactly-once guarantee across concurrent independent writers.

SHA-256 integrity is tamper-evident metadata, not a cryptographic signature.

## Product boundary

WorkProof Runtime is not a replacement for agents, browsers, workflow engines, MCP registries, memory systems, or observability platforms. Those systems can be integrated as adapters while the Work Object, effect, verification, recovery, and proof semantics remain invariant.

## Next engineering gates

Signed proof identity, remote proof/artifact retention, generalized compensation/saga semantics, external browser navigation where permitted, worker/process boundaries, remote control-plane/API/SDK surfaces, and user-facing Studio remain separate milestones.

This repository does not make a global novelty claim.
