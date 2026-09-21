# Release Gate v1.8 - Explicit Saga and Compensation Semantics

Date: 2026-09-21

## Scope

Model compensation as explicit, auditable work linked to originating effects. The runtime must not imply that arbitrary external side effects can be rolled back automatically.

## Acceptance gates

- [ ] Saga state is explicit and durable.
- [ ] Forward effects link to compensation effects.
- [ ] Compensation has independent effect identity and idempotency.
- [ ] Compensation obeys work risk ceilings and approval policy.
- [ ] Lost compensation acknowledgement is reconciled before another write.
- [ ] Partial and unresolved compensation states remain explicit.
- [ ] Verified compensation is not replayed after persistence/resume.
- [ ] Proof bundles preserve forward/compensation lineage.
- [ ] Full CI, benchmark, demo, CLI, and live smoke pass.

## Safety boundary

Compensation is not guaranteed rollback. The runtime records what was attempted, what was independently verified, and what remains unresolved.

## Milestone result

v1.8 is complete only after feature CI and merged-main CI pass.
