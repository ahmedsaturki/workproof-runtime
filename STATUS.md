# WorkProof Runtime Status

Date: 2026-09-21

## Current main

**v1.2-dev signed trust-policy synchronization is verified on main.**

Current main commit:
b6ef830d79dc432314a4da0f6e143ddb3a8b6f61

Verification:
- v1.2 feature CI: run #298, 77/77 tests, dependency audit passed, source audit passed, benchmark/demo/CLI passed, live GitHub smoke passed.
- merged-main CI: run #299, 77/77 tests, dependency audit passed, source audit passed, benchmark/demo/CLI passed, live GitHub smoke passed.
- namespace-scoped signer trust regression passed.
- trust client cryptographic validation regression passed.
- filesystem path leakage regression passed.

## v1.2 result

- [x] Signed trust-policy snapshots.
- [x] Canonical snapshot digesting.
- [x] Administrative Ed25519 signatures.
- [x] Explicit signer authorization.
- [x] Namespace-scoped administrative signer trust.
- [x] Deterministic accept/noop/conflict/rollback reconciliation.
- [x] Authenticated registry trust transport.
- [x] Signed snapshot replication between two self-hosted registries.
- [x] Revocation propagation through snapshots.
- [x] Persistent trust snapshot index and audit event history.
- [x] Security and dependency audit.

## Active next gate

Branch: **feature/v1.3-retention-gc**

Goal:
- content inventory
- reachability graph
- retention classes
- dry-run garbage collection
- protected roots/pins
- namespace-aware lifecycle boundaries
- orphan detection and repair
- crash-safe index updates

## Remaining platform work

- [ ] v1.3 retention and garbage collection
- [ ] generalized compensation/saga engine
- [ ] external browser navigation where permitted
- [ ] distributed/remote workers and control plane
- [ ] Studio / REST / SDK surfaces
- [ ] hosted/managed deployment

## Verification rule

A successful tool response is a receipt, not proof. Work is verified only when independent evidence satisfies the Work Contract success criteria.
