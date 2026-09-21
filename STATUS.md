# WorkProof Runtime Status

Date: 2026-09-21

## Current main

**v1.8 explicit saga and compensation semantics are verified on main.**

Main merge commit:
7ece472d4701adbc8aaaddd3671579de0ecf8eda

Latest merged-main verification:
- CI #478: success.
- source audit: 111/111 required paths.
- dependency security audit: success.
- retention lifecycle suite: 9/9 passed.
- full unit/integration suite: passed.
- benchmark: passed.
- demo: verified.
- CLI proof and mission: verified.
- live GitHub smoke: verified.

## Active milestone

**v1.9 — durable saga recovery after worker loss**

Active branch:
feature/v1.9-saga-worker-loss-recovery

Acceptance targets:
- partial saga survives worker/process loss as a durable Work Object.
- replacement worker can acquire saga recovery lease after expiry.
- verified compensation is never replayed.
- pending compensation executes through the existing policy/idempotency/reconciliation path.
- ambiguous compensation acknowledgement is reconciled before retry.
- stale recovery ownership cannot continue after lease handoff.

## Closed milestones

- [x] v1.0 self-hosted proof registry.
- [x] v1.1 authenticated registry.
- [x] v1.2 signed trust-policy synchronization.
- [x] v1.3 retention/reachability/GC lifecycle.
- [x] Browser acceptance reliability correction.
- [x] v1.4 deterministic worker ownership.
- [x] v1.4.1 persistent cross-process lease authority.
- [x] v1.5 WorkEngine execution-lease binding.
- [x] v1.6 durable worker-loss recovery.
- [x] v1.7 authenticated control-plane and SDK foundation.
- [x] v1.8 explicit saga/compensation semantics.

## Verification rule

A successful tool response is a receipt, not proof. Work is verified only when independent evidence satisfies the Work Contract success criteria.
