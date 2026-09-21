# WorkProof Runtime Status

Date: 2026-09-21

## Current main

**v2.3-dev control-plane hardening is verified on main.**

Merged v2.3 commit:
47e09002f135c0d2f999b2465e5bfbd291db4c22

Merged-main CI:
- CI #621: success
- source-tree audit: 126/126
- dependency security audit: success
- full sequential test-file verification: 32/32
- benchmark/demo/CLI/live GitHub smoke: success

## Verified v2.3 gates

- [x] durable SQLite idempotency ledger
- [x] same-key replay without repeated mutation
- [x] same-key logical conflict rejection
- [x] concurrent same-key in-progress rejection
- [x] idempotency persistence across process restart
- [x] invalid idempotency-key validation
- [x] SDK idempotency-key propagation
- [x] Studio idempotency-key propagation and replay-header preservation
- [x] feature CI on final v2.3 head
- [x] merged-main CI on final v2.3 merge
- [x] final v2.3 audit documentation

## Verified broader platform gates

- [x] proof registry and authenticated registry transport
- [x] signed proof identity and trusted signer policy
- [x] proof-vault retention, reachability, and GC lifecycle
- [x] persistent execution/recovery lease authority
- [x] worker-loss recovery
- [x] authenticated control plane and SDK
- [x] explicit saga and durable compensation recovery
- [x] local Studio foundation
- [x] authenticated Studio control delegation
- [x] proof/audit Studio surface

## Remaining platform work

- [ ] broader distributed worker/control-plane hardening
- [ ] additional capability packs and external integrations
- [ ] remote/distributed Studio mode
- [ ] richer visualization beyond proof/audit inspection

## Verification rule

A successful tool response is a receipt, not proof. Work is verified only when independent evidence satisfies the Work Contract success criteria.
