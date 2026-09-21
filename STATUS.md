# WorkProof Runtime Status

Date: 2026-09-21

## Current main

**v2.5-dev worker lifecycle and safe reassignment hardening is verified on main.**

Merged v2.4 commit:
77603553fff569b230a71de0b92aa3e4a6ae1342

Merged v2.5 commit:
234e4397ae8e98acf1fcdf5fd57c42188582ae8f

Merged-main CI:
- CI #653: success
- source-tree audit: 131/131 required paths
- dependency security audit: success
- Chromium/CDP preflight: success
- strict TypeScript build: success
- retention lifecycle suite: success
- full sequential unit/integration suite: success
- benchmark: success
- demo: success
- CLI proof verification: success
- CLI mission execution: success
- live GitHub integration smoke: success

## Verified v2.4 gates

- [x] ExecutionFence type exposed by the kernel.
- [x] Fence contains resource, lease identity, owner, revision, and token.
- [x] Persistent and in-memory authorities implement assertOwned.
- [x] CapabilityContext carries the execution fence.
- [x] WorkEngine asserts ownership before capability execution.
- [x] WorkEngine asserts ownership after capability execution.
- [x] Dedicated stale-worker execution regression.
- [x] Multi-process stale-worker takeover regression.
- [x] Feature CI on final v2.4 head: CI #652 success.
- [x] Merged-main CI on final v2.4 merge: CI #653 success.
- [x] Final v2.4 release gate and audit documentation.

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
- [x] durable control mutation idempotency
- [x] execution fencing token boundary

## Verified v2.5 gates

- [x] worker liveness classification from heartbeat age
- [x] safe reassignment eligibility respects active leases
- [x] read-only worker status exposure through the control-plane surface
- [x] persistent worker lifecycle behavior across process restart
- [x] feature CI #660 and merged-main CI #661
- [x] final v2.5 audit documentation

## Active v2.6 target

`worker-aware-studio`

- read-only worker/liveness visibility in Studio
- preserve existing Studio hardening and no direct mutation authority
- surface active/stale/offline state without exposing filesystem internals

## Remaining platform work

- [ ] additional capability packs and external integrations
- [ ] remote/distributed Studio mode
- [ ] richer visualization beyond proof/audit inspection

## Verification rule

A successful tool response is a receipt, not proof. Work is verified only when independent evidence satisfies the Work Contract success criteria.
