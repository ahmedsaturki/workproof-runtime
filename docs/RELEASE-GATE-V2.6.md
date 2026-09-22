# Release Gate v2.6-dev - Worker-aware Studio

Date: 2026-09-21

## Scope

Project v2.5 worker lifecycle information into the operator-facing Studio without giving Studio mutation or lease authority.

## Acceptance gates

- [x] Studio accepts an optional worker status source.
- [x] Worker liveness is projected as active, stale, or offline.
- [x] Studio exposes a read-only worker endpoint.
- [x] The endpoint strips lease identifiers, metadata, and other non-presentation internals.
- [x] Unconfigured worker visibility fails closed with HTTP 503.
- [x] Studio UI renders worker lifecycle state and heartbeat age.
- [x] Existing Studio control, proof/audit, security-header, and no-vault regressions remain covered.
- [x] Feature CI #677 green on final v2.6 head.
- [x] Merged-main CI #678 green on final v2.6 merge.

## Safety boundary

Studio is a projection layer. Worker liveness does not revoke leases, stop external requests, or replace the control-plane authority. v2.5 fencing and lease ownership remain authoritative.

## Milestone result

Complete only after feature and merged-main CI pass on the final implementation state.

## Verification evidence

- Feature head: `bb4b4784b45af90bb9464d51d14c466143881cdb`
- Feature CI #677: success
- Merged commit: `172757754264398137a2982ca62a5d5449028f04`
- Merged-main CI #678: success
- Source-tree audit: 135/135
- Dependency security audit: success
- Chromium/CDP preflight: success
- Strict TypeScript build: success
- Retention lifecycle: success
- Full sequential suite: success
- Benchmark/demo/CLI/live GitHub smoke: success

## Milestone result

**Verified on main.**
