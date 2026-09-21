# WorkProof Runtime Status

Date: 2026-09-21

## Current main

**v1.7 authenticated control-plane and SDK foundation is verified on main.**

Main merge commit:
8f183ea43ebdc9558ca48c0982dca34919438a90

Merged-main verification:
- CI #449: success.
- source audit: 113/113 required paths.
- dependency security audit: success.
- retention lifecycle suite: passed.
- full sequential unit/integration suite: passed.
- benchmark: passed.
- demo: verified.
- CLI proof and mission: verified.
- live GitHub smoke: verified.

## Active milestone

**v1.8 — explicit saga/compensation semantics**

Active branch:
feature/v1.8-saga-compensation

Acceptance targets:
- first-class compensating effects with explicit auditable identity.
- forward-effect to compensation linkage.
- compensation policy and risk ceilings.
- lost-acknowledgement reconciliation before duplicate compensation.
- partial and unresolved states remain explicit.
- persisted verified compensation is never replayed.
- proof bundles preserve forward/compensation lineage.

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

## Verification rule

A successful tool response is a receipt, not proof. Work is verified only when independent evidence satisfies the Work Contract success criteria.
