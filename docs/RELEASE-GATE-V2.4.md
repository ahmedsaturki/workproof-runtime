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
- [x] Feature CI #652 green on final v2.4 head.
- [x] Merged-main CI #653 green on final v2.4 merge.

## Verification evidence

- Feature head: `8f11968bb06dfc6b3958aac5435afd0fe5f60569`
- Feature CI: #652 — success
- Merged commit: `77603553fff569b230a71de0b92aa3e4a6ae1342`
- Merged-main CI: #653 — success
- Source-tree audit: 131/131 required paths
- Dependency security audit: success
- Chromium/CDP preflight: success
- Strict build: success
- Retention lifecycle: success
- Full sequential suite: success
- Benchmark/demo/CLI/live GitHub smoke: success

## Safety boundary

Fencing closes the runtime's execution boundary. A third-party system can only provide remote fencing if it accepts and enforces the supplied token or equivalent conditional version. WorkProof does not claim universal revocation of already-dispatched external requests.

## Milestone result

**Verified on main.**
