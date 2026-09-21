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
- [ ] Feature CI green on final v2.6 head.
- [ ] Merged-main CI green on final v2.6 merge.

## Safety boundary

Studio is a projection layer. Worker liveness does not revoke leases, stop external requests, or replace the control-plane authority. v2.5 fencing and lease ownership remain authoritative.

## Milestone result

Complete only after feature and merged-main CI pass on the final implementation state.
