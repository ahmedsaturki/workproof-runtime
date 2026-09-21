# WorkProof Runtime Status

Date: 2026-09-21

## Current main

**v1.5 WorkEngine execution-lease integration is verified on main.**

Main commit:
b09fbf40489944b09dbcb33dda73ba0fcb57fb04

Verification:
- merged-main CI #410: success.
- source audit: 101/101 required paths.
- dependency security audit: success.
- retention lifecycle suite: passed.
- full sequential unit/integration suite: passed.
- benchmark: passed.
- demo: verified.
- CLI proof: verified.
- CLI mission: verified.
- live GitHub smoke: verified.

## Closed milestones

- [x] v1.0 self-hosted proof registry.
- [x] v1.1 authenticated registry.
- [x] v1.2 signed trust-policy synchronization.
- [x] v1.3 retention/reachability/GC lifecycle.
- [x] v1.3 browser acceptance reliability correction.
- [x] v1.4 deterministic worker-ownership foundation.
- [x] v1.4.1 persistent cross-process lease authority.
- [x] v1.5 WorkEngine execution-lease binding.

## Current engineering gate

**v1.6 — worker-loss recovery and authenticated control-plane foundation**

Parent issue:
#26

Next acceptance targets:
- durable Work Object reload after worker loss.
- deterministic lease-expiry recovery without duplicate external effects.
- authenticated control-plane dispatch primitives.
- SDK round-trip preservation of Work Object and proof semantics.
- explicit saga/compensation primitives.
- complete CI and live integration verification.

## Verification rule

A successful tool response is a receipt, not proof. Work is verified only when independent evidence satisfies the Work Contract success criteria.
