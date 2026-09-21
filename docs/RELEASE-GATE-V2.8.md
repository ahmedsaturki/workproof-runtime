# Release Gate v2.8-dev - Operator Lease and Fence Visibility

Date: 2026-09-21

## Scope

Expose authoritative lease ownership, revision, and expiry state for operator diagnosis while keeping execution fencing tokens inside the execution boundary.

## Acceptance gates

- [x] Coordination exposes a sanitized LeaseStatus projection.
- [x] Control plane exposes read-only `GET /v1/leases`.
- [x] Control plane returns 503 when lease visibility is not configured.
- [x] Studio exposes local `GET /api/leases`.
- [x] Studio exposes authenticated remote `GET /api/leases`.
- [x] Missing remote bearer credentials fail with HTTP 401.
- [x] Remote control-plane outages fail with HTTP 503.
- [x] Studio re-sanitizes remote lease records.
- [x] Fencing tokens are absent from control-plane and Studio responses.
- [x] Lease visibility has no acquire/renew/release/reassign mutation path.
- [x] PersistentLeaseStore and in-memory LeaseStore share the same LeaseStatus contract.
- [x] Worker visibility, proof/audit, control, vault, and security behavior remain intact.
- [x] Feature CI #708 passed the initial v2.8 implementation gate.
- [x] PR CI #709 passed the initial v2.8 implementation gate.
- [x] Merged-main CI #710 passed the initial v2.8 implementation gate.
- [ ] Finalization feature CI passes with the corrected 140-path source manifest and persistent parity regression.
- [ ] Finalization PR/main CI passes on the merged final state.

## Safety boundary

Lease visibility is diagnostic only. It does not grant control-plane mutation authority and does not turn liveness or ownership metadata into proof that an external side effect has stopped.

## Milestone result

Complete only after the finalization branch and the merged main commit both pass the full verification pipeline.
