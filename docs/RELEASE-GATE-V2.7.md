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
- [ ] Feature CI green on final v2.7 head.
- [ ] Merged-main CI green on final v2.7 merge.

## Safety boundary

Studio never acquires leases, mutates workers, authorizes reassignment, or treats liveness as proof of stopped external activity. The authenticated control plane remains authoritative.

## Milestone result

Complete only after feature and merged-main CI pass on the final implementation state.
