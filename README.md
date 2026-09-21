# WorkProof Runtime

Outcome-first digital work runtime: execute real work, reconcile external effects, verify outcomes, preserve proof, manage proof lifecycle, recover execution after worker loss, and expose authenticated control.

## Current status

**v1.8 explicit saga/compensation semantics are in development.**

The runtime models compensation as explicit auditable work linked to its originating forward effect. Compensation is never treated as automatic rollback.

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

## v1.8 saga/compensation

- Compensation uses a distinct effect kind and independent effect identity.
- Every compensation is linked to an originating forward effect.
- Saga state tracks forward and compensation effect lineage.
- Compensation obeys work risk ceilings and approval policy.
- Lost acknowledgements reconcile external state before another compensation write.
- Partial and unresolved compensation remain explicit.
- Persisted verified compensation is not replayed.
- Proof bundles preserve saga/effect lineage.

## Safety boundary

Compensation is not guaranteed rollback. The runtime records what was attempted, what was independently verified, and what remains unresolved.

Control-plane authentication, proof signatures, signer trust, retention, and worker leases remain separate concerns with their existing boundaries.

## Next engineering gates

External browser navigation where permitted, further worker/control-plane hardening, broader capability packs, and product-facing Studio surfaces remain separate milestones.

This repository does not make a global novelty claim.
