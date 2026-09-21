# WorkProof Runtime Status

Date: 2026-09-21

## Current main

**v1.3 retention, reachability, garbage collection, and browser-acceptance reliability are verified on main.**

Main commit:
6c01f201f6cec32ab6fa34a01fe878d3f47c5b0b

Verification:
- merged-main CI #358: success.
- source audit: 93/93 required paths.
- dependency security audit: success.
- retention suite: 9/9.
- full sequential suite: 23/23 test files.
- benchmark V2: passed.
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

## Current engineering gate

**v1.4 — distributed work execution and control-plane foundations**

The next milestone is intentionally separate from v1.3. It should address:
- durable remote worker/process execution boundaries
- a minimal authenticated REST/control-plane surface
- SDK-level Work Object and proof operations
- generalized compensation/saga primitives
- explicit execution leases and recovery ownership
- clear separation between local runtime state and remotely retained proof

## Verification rule

A successful tool response is a receipt, not proof. Work is verified only when independent evidence satisfies the Work Contract success criteria.
