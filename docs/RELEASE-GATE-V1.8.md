# Release Gate v1.8 - Explicit Saga and Compensation Semantics

Date: 2026-09-21

## Scope

Model compensation as explicit, auditable work linked to originating effects. The runtime must not imply that arbitrary external side effects can be rolled back automatically.

## Acceptance gates

- [x] Saga state is explicit and durable.
- [x] Forward effects link to compensation effects.
- [x] Compensation has independent effect identity and idempotency.
- [x] Compensation obeys work risk ceilings and approval policy.
- [x] Lost compensation acknowledgement is reconciled before another write.
- [x] Partial and unresolved compensation states remain explicit.
- [x] Verified compensation is not replayed after persistence/resume.
- [x] Proof bundles preserve forward/compensation lineage.
- [x] Full CI, benchmark, demo, CLI, and live smoke pass.

## Safety boundary

Compensation is not guaranteed rollback. The runtime records what was attempted, what was independently verified, and what remains unresolved.

## Milestone result

v1.8 is verified on main by merge commit 545dffda29c04249677f9605e5709f8e8c9d2ffb, after feature CI #475 and merged-main CI #476 passed.

The broader issue-level requirement to recover partially completed sagas after worker loss is intentionally tracked as separate hardening and is not represented as completed by this gate.
