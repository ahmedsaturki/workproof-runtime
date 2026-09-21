# WorkProof Runtime

Outcome-first digital work runtime: execute real work, reconcile external effects, verify outcomes, preserve proof, manage proof lifecycle, recover execution after worker loss, and expose authenticated control.

## Current status

**v1.9 durable saga recovery after worker loss is in development.**

The runtime now has explicit saga and compensation semantics. This milestone extends those semantics across worker/process loss so a replacement owner can resume pending compensation work without replaying verified compensation.

## Core loop

Goal -> Outcome Contract -> Capability -> Execute -> Observe/Reconcile -> Verify -> Recover/Substitute -> Deliver -> Proof -> Retain -> Control -> Compensate -> Recover

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

## v1.9 saga recovery

- Saga recovery acquires a dedicated, lease-bound ownership resource.
- A replacement worker can recover a persisted partial saga after the previous lease expires.
- Already verified compensations are skipped.
- Pending compensations reuse existing policy, idempotency, reconciliation, and independent verification rules.
- Lost acknowledgements are reconciled before another compensation write.
- Stale recovery owners are rejected by the same lease authority.
- Recovery remains explicit and auditable; it is not automatic rollback.

## Safety boundary

Saga recovery is ownership recovery plus bounded compensation execution. It does not establish arbitrary external rollback or atomic exactly-once semantics.

## Next engineering gates

Multi-user signer trust policy, broader remote proof/artifact lifecycle, further worker/control-plane hardening, external browser navigation where permitted, and product-facing Studio surfaces remain separate milestones.

This repository does not make a global novelty claim.
