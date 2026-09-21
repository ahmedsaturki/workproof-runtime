# Release Gate v3.0-dev - Operational Health Projection

Date: 2026-09-21

## Scope

Turn the Studio from a filtered Work Object list into a bounded operational decision-support surface without changing WorkProof execution semantics.

## Acceptance gates

- [x] Read-only operational overview endpoint.
- [x] Work status and risk distributions.
- [x] Effect health distribution and attention count.
- [x] Verification health distribution and not-verified count.
- [x] Optional worker liveness summary.
- [x] Optional lease active/expired summary.
- [x] Deterministic attention queue with explicit reason codes.
- [x] Bounded attention output.
- [x] Corrupt Work Objects are excluded rather than guessed.
- [x] Projection is read-only and does not change execution or security state.
- [x] Studio overview cards and attention UI.
- [x] End-to-end regression coverage.
- [ ] Additional capability-pack coverage beyond current foundations.

## Safety boundary

Operational health is a projection, not proof. A receipt, a healthy worker, an active lease, or a prior verified state must not be interpreted as proof of a current external outcome.

## Milestone result

The v3.0-dev operational health milestone is complete only after feature CI and merged-main CI both pass.
