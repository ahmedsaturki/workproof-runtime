# WorkProof Runtime

Outcome-first digital work runtime: execute real work, reconcile external effects, verify outcomes, preserve proof, manage proof lifecycle, recover execution after worker loss, expose authenticated control, and provide a local operational Studio.

## Current status

**v3.0-dev operational health projection is verified on main.**

The verified v3.0 line extends v2.9 with a read-only operational health projection and deterministic attention queue derived from persisted Work Objects, effects, verification state, and optionally configured worker and lease sources.

## Core loop

Goal -> Outcome Contract -> Capability -> Execute -> Observe/Reconcile -> Verify -> Recover/Substitute -> Deliver -> Proof -> Retain -> Control -> Compensate

## Verified platform gates

v1.0 through v3.0 are preserved as verified milestones, covering proof registry and trust, retention, worker ownership and recovery, control-plane idempotency, fencing, saga recovery, authenticated Studio control, proof/audit, lease visibility, operational filtering, and operational health projection.

## v3.0 operational health

- GET /api/operations/overview is a read-only health projection.
- Work summaries include total and verified counts plus status and risk distributions.
- Effect summaries distinguish recorded effect statuses and explicitly count unknown/unresolved effects.
- Verification summaries distinguish recorded verification states and not-verified work.
- Optional worker and lease sources produce bounded health summaries only when configured.
- Attention items expose explicit reason codes and deterministic details.
- Attention output is bounded and deterministically ordered.
- Corrupt persisted Work Objects are skipped rather than guessed.
- Studio renders health cards and the attention queue.
- The projection never mutates work, leases, proofs, authorization, or execution.

## Safety boundary

A capability receipt is not proof of the final outcome. External side effects require independent state verification or reconciliation.

Operational health is diagnostic only. Healthy workers, active leases, or prior verification do not prove a current external outcome.

Compensation is not guaranteed rollback. The runtime records what was attempted, what was independently verified, and what remains unresolved.

Proof integrity and signatures establish integrity and authenticity under their defined trust boundaries; they do not create an organization-wide trust or revocation policy by themselves.

## Next engineering gates

Additional capability packs/integrations and richer operational visualization remain separate milestones.

This repository does not make a global novelty claim.
