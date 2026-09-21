# Release Gate v2.3-dev - Durable Control Mutation Idempotency

Date: 2026-09-21

## Scope

Harden authenticated control-plane mutations against duplicate client retries, same-key races, and process restarts without claiming exactly-once semantics for external systems.

## Acceptance gates

- [x] Durable SQLite idempotency ledger.
- [x] Same key + same logical mutation replays without repeating the mutation.
- [x] Same key + different logical mutation is rejected.
- [x] Concurrent same-key mutation is blocked while the first is pending.
- [x] Completed idempotency records survive process restart.
- [x] SDK exposes idempotency keys.
- [x] Studio generates and forwards per-action idempotency keys.
- [ ] Feature CI green on final v2.3 head.
- [ ] Merged-main CI green on final v2.3 merge.

## Safety boundary

This ledger protects the control-plane mutation boundary. It does not replace external capability idempotency, reconciliation, or verification. Pending mutations fail closed rather than being blindly reclaimed.

## Milestone result

The v2.3-dev control-plane hardening milestone is complete only after feature CI and merged-main CI pass on the final implementation state.
