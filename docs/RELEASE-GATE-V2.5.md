# Release Gate v2.5-dev - Worker Lifecycle and Safe Reassignment

Date: 2026-09-21

## Scope

Harden the distributed worker layer above execution fencing with authoritative heartbeat-based liveness, explicit reassignment eligibility, and read-only operational visibility.

## Acceptance gates

- [x] Worker registration and heartbeat persistence base exists.
- [x] Liveness classification distinguishes active, stale, and offline workers.
- [x] Reassignment eligibility refuses takeover while an active lease remains.
- [x] Reassignment eligibility permits takeover only after worker liveness is non-active and the authoritative lease is no longer active.
- [x] Persistent worker lifecycle behavior survives reopen.
- [x] Read-only control-plane worker status endpoint returns bounded lifecycle state when configured.
- [x] Missing worker-status configuration fails closed with HTTP 503.
- [ ] Feature CI green on final v2.5 head.
- [ ] Merged-main CI green on final v2.5 merge.

## Safety boundary

Heartbeat staleness is a liveness signal, not proof that a process or third-party request has stopped. Lease ownership and v2.4 execution fencing remain the authoritative execution controls.

## Milestone result

Complete only after feature and merged-main CI pass on the final implementation state.
