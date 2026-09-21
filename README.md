# WorkProof Runtime

Outcome-first digital work runtime: execute real work, reconcile external effects, verify outcomes, preserve proof, manage proof lifecycle, recover execution after worker loss, and expose authenticated control.

## Current status

**v1.9 durable saga recovery is verified on main.**

Main merged commit: `f0173fd9c0603fd1fa58ea6f722486f52a04f932`

The v1.9 milestone adds durable compensation recovery after worker/process loss while preserving explicit ownership, reconciliation, verification, and proof semantics.

## Core loop

Goal -> Outcome Contract -> Capability -> Execute -> Observe/Reconcile -> Verify -> Recover/Substitute -> Deliver -> Proof -> Retain -> Control -> Compensate

## Verified platform gates

- v1.0 self-hosted proof registry.
- v1.1 authenticated registry.
- v1.2 signed trust-policy synchronization.
- v1.3 retention/reachability/GC lifecycle.
- Browser acceptance reliability correction.
- v1.4 deterministic worker ownership.
- v1.4.1 persistent cross-process lease authority.
- v1.5 WorkEngine execution-lease binding.
- v1.6 worker-loss recovery.
- v1.7 authenticated control-plane and SDK foundation.
- v1.8 explicit saga/compensation semantics.
- v1.9 durable saga recovery.

## v1.9 durable saga recovery

- Recoverable sagas can be discovered from persisted Work Objects.
- Recovery owns a dedicated saga lease before executing compensation.
- Expired worker ownership can be replaced deterministically.
- Verified compensation is skipped on resume.
- Pending compensation input and lineage are reconstructed from durable effect state.
- Ambiguous acknowledgements reconcile before any retry.
- A stale owner stops when a replacement worker takes over.
- Corrupt persisted compensation lineage fails closed as unresolved.
- Recovery events and saga state are persisted for audit.

## Verification evidence

The v1.9 candidate passed feature CI #528. The merged-main CI #530 also passed source audit, security audit, build, retention, full sequential integration verification, benchmark, demo, CLI proof/mission, and live GitHub smoke.

## Safety boundary

Compensation is not guaranteed rollback. The runtime records what was attempted, what was independently verified, and what remains unresolved.

GitHub marker-based idempotency is reconciliation-based, not an atomic exactly-once primitive across independent writers.

Proof integrity and signatures establish integrity/authenticity properties under their defined trust boundaries; they do not create an organization-wide trust or revocation policy by themselves.

Saga recovery is ownership recovery plus bounded compensation execution. It is not an automatic rollback guarantee and does not create global exactly-once semantics across arbitrary independent writers.

## Next engineering gates

Multi-user signer trust policy, broader distributed worker/control-plane hardening, additional capabilities/integrations, and product-facing Studio surfaces remain separate milestones.

This repository does not make a global novelty claim.
