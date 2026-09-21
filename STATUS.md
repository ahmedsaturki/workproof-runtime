# WorkProof Runtime Status

Date: 2026-09-21

## Current main

**v1.7 authenticated control-plane and SDK foundation is verified on main.**

Main merge commit:
86f8effb0e6178eb2f69d7b33472c7579be54d0f

Merged-main verification:
- CI #448: success.
- source audit: 113/113 required paths.
- dependency security audit: success.
- retention lifecycle suite: passed.
- full sequential unit/integration suite: passed.
- benchmark: passed.
- demo: verified.
- CLI proof and mission: verified.
- live GitHub smoke: verified.

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

## Current engineering gate

**v1.8 — explicit saga/compensation semantics**

Parent issue:
#26

New gate:
#34

Next acceptance targets:
- first-class compensating work/actions with explicit auditable identity.
- forward-effect to compensation linkage.
- compensation policy and risk ceilings.
- partial compensation and unresolved states remain explicit.
- replay/recovery never assumes arbitrary rollback.

## Verification rule

A successful tool response is a receipt, not proof. Work is verified only when independent evidence satisfies the Work Contract success criteria.