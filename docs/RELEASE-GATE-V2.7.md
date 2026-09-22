# Release Gate v2.7-dev - Authenticated Remote Worker Visibility

Date: 2026-09-21

## Scope

Extend worker-aware Studio visibility across process/network boundaries by reading worker state through the authenticated control plane.

## Acceptance gates

- [x] Studio uses the configured control plane as the authoritative worker-status source.
- [x] Worker reads require a valid bearer credential when routed remotely.
- [x] Missing credentials fail closed with HTTP 401.
- [x] Upstream control-plane authorization responses are preserved.
- [x] Unavailable remote control plane fails closed with HTTP 503.
- [x] Remote worker payload is re-sanitized at the Studio boundary.
- [x] Local workerStatusSource behavior remains available when no control plane is configured.
- [x] Existing Studio control, proof/audit, security-header, and vault behavior remains covered.
- [x] Feature CI #694 green on final v2.7 head.
- [x] Merged-main CI #695 green on final v2.7 merge.

## Safety boundary

Studio never acquires leases, mutates workers, authorizes reassignment, or treats liveness as proof of stopped external activity. The authenticated control plane remains authoritative.

## Milestone result

Complete only after feature and merged-main CI pass on the final implementation state.

## Verification evidence

- Feature head: `9f0932a88ab78621a08f6d73973825d5787da94c`
- Feature CI #694: success
- Merged commit: `df3bda90e10e17f5e683a153c68d7537e9d4a2c0`
- Merged-main CI #695: success
- Source-tree audit: 137/137
- Dependency security audit: success
- Chromium/CDP preflight: success
- Strict TypeScript build: success
- Retention lifecycle: success
- Full sequential suite: success
- Benchmark/demo/CLI/live GitHub smoke: success

## Milestone result

**Verified on main.**
