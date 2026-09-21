# Final Audit v2.8 - Operator Lease and Fence Visibility

Date: 2026-09-21

## Release identity

- Finalization branch: `feature/v2.8.1-persistent-lease-visibility`
- v2.8 implementation merge: `44ed49dac589389bdad9bbcb6e177a74f43767f9`
- Scope: diagnostic lease/fence visibility with persistence parity and complete release traceability

## Required verification

- source-tree completeness
- dependency security audit
- Chromium/CDP preflight
- strict TypeScript build
- retention lifecycle suite
- full sequential unit/integration suite
- lease visibility regression
- persistent lease visibility regression
- benchmark
- demo
- CLI proof verification
- CLI mission execution
- live GitHub smoke
- feature CI
- pull-request CI
- merged-main CI

## Functional evidence

- Control plane exposes read-only `GET /v1/leases`.
- Studio exposes local and authenticated remote `GET /api/leases`.
- Remote access requires a valid bearer credential.
- Missing configuration fails closed with HTTP 503.
- Remote control-plane outage fails with HTTP 503.
- Lease projections are sanitized and contain no execution fencing token.
- Lease visibility never acquires, renews, releases, or reassigns leases.
- PersistentLeaseStore implements the same read-only projection as LeaseStore.
- Existing worker, proof/audit, control, vault, and security behavior remains covered.

## Initial v2.8 evidence

- Feature CI #708: success
- PR CI #709: success
- Merged-main CI #710: success
- v2.8 merge commit: `44ed49dac589389bdad9bbcb6e177a74f43767f9`

## Finalization purpose

The post-merge audit found two traceability/correctness gaps:
1. v2.8 release/audit documentation and the lease regression were not enforced by the old source-manifest list.
2. PersistentLeaseStore lacked the new LeaseStatus projection.

The finalization branch closes both gaps before v2.8 is treated as fully closed.

## Status

**Pending finalization CI and merged-main verification.**
