# Release Gate v1.9 - Durable Saga Recovery

Date: 2026-09-21

## Scope

Recover a partially compensated saga after worker/process loss without replaying verified compensation and without allowing a stale worker to continue after ownership moves.

## Acceptance gates

- [x] Persist compensation operation, input, capability, risk, source-effect lineage, and idempotency identity.
- [x] Discover persisted sagas with pending compensation effects.
- [x] Acquire a dedicated saga recovery lease before compensation execution.
- [x] Wait when another live recovery worker owns the saga.
- [x] Reap expired ownership and allow replacement takeover.
- [x] Skip verified compensation during recovery.
- [x] Reconstruct pending compensation from durable effect state.
- [x] Reconcile ambiguous compensation acknowledgement before blind retry.
- [x] Stop stale recovery when lease ownership moves.
- [x] Persist recovery events and resulting saga lineage.
- [ ] Feature CI pass on the v1.9 head.
- [ ] Merged-main CI pass after integration.

## Safety boundary

Recovery is ownership recovery plus bounded compensation execution. It is not an automatic rollback guarantee. Every compensation remains explicit, policy-checked, auditable, idempotency-aware, and independently verified.

## Non-claims

The runtime does not claim a global atomic exactly-once guarantee across independent writers or arbitrary rollback of effects for which no explicit compensation capability exists.
