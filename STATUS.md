# WorkProof Runtime Status

Date: 2026-09-21

## Current main

**v1.4 worker-ownership foundation is verified on main.**

Main commit:
8e5e5627a170e681105965dc4e9c6dbf50a74906

Verification:
- merged-main CI #379: success.
- source audit: 96/96 required paths on the v1.4 foundation branch.
- dependency security audit: success.
- retention lifecycle suite: 9/9.
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

## Current engineering gate

**v1.4 — persistent distributed work foundations**

The next gate should add:
- persistent cross-process lease authority
- worker execution ownership integrated with the runtime
- explicit worker-loss reconciliation
- authenticated control-plane dispatch
- SDK-level Work Object/proof operations
- generalized compensation/saga primitives

The in-memory lease layer deliberately remains a local ownership primitive, not a distributed consensus service.

## Verification rule

A successful tool response is a receipt, not proof. Work is verified only when independent evidence satisfies the Work Contract success criteria.
