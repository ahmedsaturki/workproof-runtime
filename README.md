# WorkProof Runtime

Outcome-first digital work runtime: execute real work, reconcile external effects, verify outcomes, preserve proof, manage proof lifecycle, recover execution after worker loss, and expose authenticated control.

## Current status

**v1.8 explicit saga/compensation semantics are verified on main.**

Compensation is modeled as explicit auditable work linked to originating forward effects. The runtime does not treat arbitrary external effects as automatically reversible.

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

## v1.8 saga/compensation

- Compensation has its own effect kind and effect identity.
- Each compensation links to its originating forward effect.
- Saga state tracks forward and compensation lineage explicitly.
- Compensation obeys work risk ceilings and approval policy.
- Ambiguous/lost acknowledgements reconcile external state before duplicate writes.
- Partial, unresolved, and fully compensated states remain explicit.
- Verified compensation is not replayed after persistence/resume.
- Proof bundles and proof-retention paths preserve saga lineage.
- Legacy work objects remain readable without a saga field.

## Safety boundary

Compensation is not guaranteed rollback. The runtime records what was attempted, what was independently verified, and what remains unresolved.

GitHub marker-based idempotency is reconciliation-based, not an atomic exactly-once primitive across independent writers.

Proof integrity and signatures establish integrity/authenticity properties under their defined trust boundaries; they do not create an organization-wide trust or revocation policy by themselves.

## Next engineering gates

Explicit saga recovery after worker/process loss, multi-user signer trust policy, further worker/control-plane hardening, broader capabilities, and product-facing Studio surfaces remain separate milestones.

This repository does not make a global novelty claim.
