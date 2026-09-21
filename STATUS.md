# WorkProof Runtime Status

Date: 2026-09-21

## Current main

**v1.4 worker-ownership foundation is verified on main.**

Main commit:
8e5e5627a170e681105965dc4e9c6dbf50a74906

Verification:
- merged-main CI #379: success.
- source audit: 96/96 required paths on the v1.4 foundation.
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

**v1.4.1 — persistent cross-process ownership**

Active branch:
feature/v1.4-persistent-leases

Implemented:
- SQLite-backed persistent lease records.
- Transactional cross-process acquisition using SQLite writer serialization.
- Durable lease identity and revision semantics.
- Persistent worker registration, heartbeat, offline state, and deterministic listing.
- Cross-process integration probe using independent Node processes.

Still pending:
- merged-main verification for this gate.
- Durable WorkEngine execution ownership integration.
- Worker-loss reconciliation.
- Authenticated control-plane dispatch.
- SDK-level Work Object/proof operations.
- Saga/compensation primitives.

## Verification rule

A successful tool response is a receipt, not proof. Work is verified only when independent evidence satisfies the Work Contract success criteria.