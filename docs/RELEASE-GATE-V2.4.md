# Release Gate v2.4-dev - Distributed Execution Fencing

Date: 2026-09-21

## Scope

Harden worker ownership at the capability execution boundary so stale workers are explicitly rejected after lease takeover.

## Acceptance gates

- [x] ExecutionFence type exposed by the kernel.
- [x] Fence contains resource, lease identity, owner, revision, and token.
- [x] Persistent and in-memory authorities implement assertOwned.
- [x] CapabilityContext carries the execution fence.
- [x] WorkEngine asserts ownership before capability execution.
- [x] WorkEngine asserts ownership after capability execution.
- [x] Dedicated stale-worker execution regression.
- [x] Multi-process stale-worker takeover regression.
- [ ] Feature CI green on final v2.4 head.
- [ ] Merged-main CI green on final v2.4 merge.

## Safety boundary

Fencing closes the runtime's execution boundary. A third-party system can only provide remote fencing if it accepts and enforces the supplied token or equivalent conditional version. WorkProof does not claim universal revocation of already-dispatched external requests.

## Milestone result

The v2.4-dev fencing milestone is complete only after feature CI and merged-main CI pass on the final implementation state.
