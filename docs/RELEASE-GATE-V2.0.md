# Release Gate v2.0-dev - Local Studio Foundation

Date: 2026-09-21

## Scope

Provide a local, dependency-free, read-only operational Studio over persisted Work Objects.

## Acceptance gates

- [x] Serve a local Studio from the runtime repository.
- [x] Provide a health endpoint.
- [x] List persisted Work Objects from the authoritative JSON repository.
- [x] Provide a detail endpoint for a Work Object.
- [x] Sanitize sensitive execution fields from the detail API.
- [x] Reject invalid/unknown Work IDs.
- [x] Add browser hardening and no-store response headers.
- [x] Add automated Studio HTTP acceptance tests.
- [ ] Authenticated Studio write/control actions.
- [ ] Rich proof/audit visualization.
- [ ] Remote/distributed Studio mode.

## Safety boundary

The v2.0 foundation exposes no state-changing Studio endpoint. Existing dispatch, cancel, and resume behavior remains governed by the authenticated control-plane layer.

## Milestone result

The v2.0-dev Studio foundation is complete only after feature CI and merged-main CI both pass.
