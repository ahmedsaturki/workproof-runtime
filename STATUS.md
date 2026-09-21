# WorkProof Runtime Status

Date: 2026-09-21

## Current main

**v1.2-dev signed trust-policy synchronization is verified on main.**

Current main audit head:
be845ab160de3597de3781630cc7bb0a1b646259

Verification:
- run #300: success, final v1.2 audit/documentation state.
- run #299: success, v1.2 merged-main verification.
- v1.2 feature and merged-main verification previously passed 77/77 tests, dependency audit, source audit, benchmark/demo/CLI, live GitHub smoke, and trust-sync security regressions.

## Active next gate

Branch: **feature/v1.3-retention-gc**

Goal:
- content inventory
- explicit retention classes
- protected pins
- reachability graph
- dry-run garbage collection
- integrity-gated deletion
- namespace-conservative lifecycle boundaries
- orphan detection/repair
- crash-safe index updates and journal recovery
- user-facing vault lifecycle commands

## Verified foundation

- [x] v1.0 self-hosted proof registry.
- [x] v1.1 authenticated registry.
- [x] v1.2 signed trust-policy synchronization.
- [x] proof integrity and cryptographic proof identity.
- [x] trust policy separation from cryptographic validity.

## Remaining platform work

- [ ] v1.3 retention and garbage collection.
- [ ] generalized compensation/saga engine.
- [ ] external browser navigation where permitted.
- [ ] distributed/remote workers and control plane.
- [ ] Studio / REST / SDK surfaces.
- [ ] hosted/managed deployment.

## Verification rule

A successful tool response is a receipt, not proof. Work is verified only when independent evidence satisfies the Work Contract success criteria.
