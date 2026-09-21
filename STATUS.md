# WorkProof Runtime Status

Date: 2026-09-21

## Current main

**v1.6 worker-loss recovery is verified on main.**

Main commit:
b7a1bacd0d47baab7d759bb572351434ac5fdb60

Merged-main verification:
- CI #422: success.
- source audit: 102/102 required paths.
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

## Current engineering gate

**v1.7 — authenticated control-plane and SDK foundation**

Parent issue:
#26
New gate:
#31

Next acceptance targets:
- authenticated status, dispatch, cancel, and resume primitives.
- durable and auditable control-plane state transitions.
- SDK round-trip preservation of Work Object and proof references.
- authorization remains distinct from cryptographic proof verification.
- saga/compensation remains a later explicit gate.

## Verification rule

A successful tool response is a receipt, not proof. Work is verified only when independent evidence satisfies the Work Contract success criteria.
