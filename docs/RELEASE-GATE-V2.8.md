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
- [x] Initial implementation feature CI #708 passed.
- [x] Initial implementation PR CI #709 passed.
- [x] Initial implementation merged-main CI #710 passed.
- [x] Finalization feature CI #726 passed.
- [x] Finalization PR CI #727 passed.
- [x] Final merged-main CI #728 passed.

## Final verification

- Required source paths: 141/141.
- Dependency security audit: 0 vulnerabilities.
- Chromium/CDP preflight: success.
- Strict TypeScript build: success.
- Retention lifecycle: success.
- Full unit/integration suite: success.
- Benchmark: success.
- Demo: success.
- CLI proof verification: success.
- CLI mission execution: success.
- Live GitHub smoke: success.

## Safety boundary

Lease visibility is diagnostic only. It does not grant control-plane mutation authority and does not turn liveness or ownership metadata into proof that an external side effect has stopped.

## Milestone result

**Verified on main at aed65c8ecf770efa7ae1d2c2aa2500133a5dbf81.**
