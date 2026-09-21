# WorkProof Runtime Status

Date: 2026-09-21

## Current main

**v2.3-dev control-plane hardening is in progress.**

Latest v2.2 proof/audit Studio merge:
5deee742ad0b481ff4e55832b972706e84de3c01

Latest v2.2 feature CI:
- CI #582: success.

Latest v2.2 merged-main CI:
- CI #583: success.

## Verified v2.2 gates

- [x] retained proof summaries from authoritative proof vault
- [x] proof integrity recomputation
- [x] independent signature verification
- [x] optional local trust-policy evaluation
- [x] vault filesystem path isolation
- [x] corrupted-proof fail-closed behavior
- [x] read-only proof/audit endpoints
- [x] missing-vault 503 behavior
- [x] v2.1 Studio control remains intact
- [x] feature CI #582
- [x] merged-main CI #583

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

## Active next branch

`feature/v2.3-control-idempotency`

Target:
- durable idempotency for authenticated control mutations
- replay protection across process restart
- same-key payload conflict detection
- concurrent mutation race protection
- SDK/Studio propagation

## Remaining platform work

- [ ] broader distributed worker/control-plane hardening
- [ ] additional capability packs and external integrations
- [ ] remote/distributed Studio mode
- [ ] richer visualization beyond proof/audit inspection

## Verification rule

A successful tool response is a receipt, not proof. Work is verified only when independent evidence satisfies the Work Contract success criteria.
