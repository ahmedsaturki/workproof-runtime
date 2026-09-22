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
- [x] Feature CI #660 green on final v2.5 head.
- [x] Merged-main CI #661 green on final v2.5 merge.

## Safety boundary

Heartbeat staleness is a liveness signal, not proof that a process or third-party request has stopped. Lease ownership and v2.4 execution fencing remain the authoritative execution controls.

## Milestone result

Complete only after feature and merged-main CI pass on the final implementation state.


## Verification evidence

- Feature head: `c36d02cab606256d25df01ea40a36d06c368a448`
- Feature CI #660: success
- Merged commit: `234e4397ae8e98acf1fcdf5fd57c42188582ae8f`
- Merged-main CI #661: success
- Source-tree audit: 133/133
- Dependency security audit: success
- Chromium/CDP preflight: success
- Strict TypeScript build: success
- Retention lifecycle: success
- Full sequential suite: success
- Benchmark/demo/CLI/live GitHub smoke: success

## Milestone result

**Verified on main.**
