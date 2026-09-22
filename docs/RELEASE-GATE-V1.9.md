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
- [x] Refuse corrupt persisted compensation lineage as unresolved.
- [x] Persist recovery events and resulting saga lineage.
- [x] Feature CI #528 passed on the v1.9 candidate.
- [x] Merged-main CI #530 passed on main.
- [x] Main CI included source audit, dependency audit, retention suite, full sequential integration suite, benchmark, demo, CLI proof/mission, and live GitHub smoke.

## Final evidence

Main merge commit:
f0173fd9c0603fd1fa58ea6f722486f52a04f932

The final closeout documentation adds FINAL-AUDIT-V1.9.md to the required source tree. The follow-up documentation CI is the final source-audit proof for the 115-path closeout.

## Safety boundary

Recovery is ownership recovery plus bounded compensation execution. It is not an automatic rollback guarantee. Every compensation remains explicit, policy-checked, auditable, idempotency-aware, and independently verified.

## Non-claims

The runtime does not claim a global atomic exactly-once guarantee across independent writers or arbitrary rollback of effects for which no explicit compensation capability exists.
