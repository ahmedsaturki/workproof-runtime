# WorkProof Runtime Status

Date: 2026-09-21

## Current main

**v2.8 diagnostic lease/fence visibility is implemented and being finalized with persistence parity and complete release traceability.**

Current main commit:
44ed49dac589389bdad9bbcb6e177a74f43767f9

v2.8 feature head:
2e5692751d60275e22131f49069207ae9d5b2d7c

Merged v2.8 commit:
44ed49dac589389bdad9bbcb6e177a74f43767f9

Verified v2.8 feature/PR evidence:
- Feature CI #708: success
- PR CI #709: success
- Merged-main CI #710: success
- source audit, dependency security audit, Chromium/CDP, strict build, retention, full suite, benchmark, demo, CLI proof, CLI mission, and live GitHub smoke: success

## Active v2.8 finalization

`feature/v2.8.1-persistent-lease-visibility`

This hardening branch closes release-traceability gaps discovered after the initial v2.8 merge and adds PersistentLeaseStore parity for lease visibility.

Target:
- enforce v2.8 release/audit documents in the source manifest
- align package metadata and operational docs to v2.8
- expose sanitized lease status from PersistentLeaseStore
- regression-test persistent lease visibility and token non-disclosure
- final feature CI and merged-main CI on the corrected source tree

## Verified broader platform gates

- [x] proof registry and authenticated registry transport
- [x] signed proof identity and trusted signer policy
- [x] proof-vault retention, reachability, and GC lifecycle
- [x] persistent execution/recovery lease authority
- [x] worker-loss recovery
- [x] authenticated control plane and SDK
- [x] explicit saga/compensation recovery
- [x] local Studio
- [x] authenticated Studio control delegation
- [x] proof/audit Studio
- [x] durable control mutation idempotency
- [x] execution fencing token boundary
- [x] worker liveness and reassignment visibility
- [x] authenticated remote worker visibility
- [x] v2.8 read-only lease/fence visibility

## Remaining platform work

- [ ] final v2.8 traceability/persistence parity patch merge and final main CI
- [ ] richer operational visualization/filtering
- [ ] additional capability packs and external integrations beyond the current foundations

## Verification rule

A successful tool response is a receipt, not proof. Work is verified only when independent evidence satisfies the Work Contract success criteria.
