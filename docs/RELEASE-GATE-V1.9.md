# Release Gate v1.9 - Durable Saga Recovery After Worker Loss

Date: 2026-09-21

## Scope

Recover partially completed saga compensation after worker/process loss without replaying verified compensation and without weakening lease, policy, idempotency, reconciliation, persistence, or proof semantics.

## Acceptance gates

- [ ] Partial saga survives worker/process loss as durable state.
- [ ] Replacement worker acquires a saga-specific execution lease after expiry.
- [ ] Verified compensation is skipped during recovery.
- [ ] Pending compensation executes through the existing bounded compensation engine.
- [ ] Ambiguous compensation acknowledgement reconciles external state before any duplicate write.
- [ ] Stale worker ownership cannot continue after lease handoff.
- [ ] Full CI, retention, benchmark, demo, CLI, and live smoke pass.

## Safety boundary

Recovery is ownership recovery plus explicit compensation execution. It is not an automatic rollback guarantee.

## Milestone result

v1.9 is complete only after feature CI and merged-main CI pass on the same verified head/merge state.
