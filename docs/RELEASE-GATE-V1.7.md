# Release Gate v1.7-dev - Authenticated Control Plane and SDK

Date: 2026-09-21

## Scope

Expose thin authenticated control and SDK surfaces around the durable Work Object model without introducing competing orchestration semantics.

## Acceptance gates

- [x] Authenticated read access to Work Objects.
- [x] Authenticated dispatch boundary.
- [x] Authenticated cancel and resume boundaries.
- [x] Mutating control requests generate auditable request IDs.
- [x] Verified/failed work cannot be cancelled remotely.
- [x] Repeated cancellation is idempotent.
- [x] SDK serializes and parses Work Objects using JSON-visible semantics.
- [x] SDK HTTP client exercises the control plane.
- [x] URL and work-id validation occurs before network access.
- [ ] Final feature CI green on final head.
- [ ] Final merged-main CI green on merge commit.

## Safety boundary

Authorization answers whether a caller may control work. Cryptographic proof verification answers whether a proof authenticates under its embedded signing key. These remain separate controls.

The control plane does not guarantee exactly-once delivery for arbitrary external effects. WorkEngine idempotency, reconciliation, verification, and execution-lease semantics remain authoritative.

## Deferred platform work

- [ ] Explicit saga/compensation primitives.
- [ ] Multi-user/namespace-aware control-plane policy.
- [ ] Remote worker fleet/control-plane durability.
- [ ] Production SDK packaging and compatibility policy.

## Milestone result

v1.7 is complete only after the final feature head and the merged-main commit both pass the complete verification pipeline.
