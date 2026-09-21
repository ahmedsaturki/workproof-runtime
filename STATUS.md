# WorkProof Runtime Status

Date: 2026-09-21

## Current state

### main
Verified v0.4 development baseline.

### feature/v0.5-github-integration
v0.5 integration branch contains:
- live GitHub repository read smoke
- GitHub repository independent verifier
- approval-gated GitHub issue write capability
- deterministic issue idempotency marker
- lost-acknowledgement reconciliation without duplicate POST
- proof integrity digest
- pack compatibility manifest
- effect operation context
- two-system lost-acknowledgement fault injection

## v0.5 gates

- [x] GitHub REST read capability with explicit risk.
- [x] Independent verifier for live repository state.
- [x] GitHub Actions live read smoke against the actual repository.
- [x] External-effect write path behind approval policy.
- [x] Local lost-acknowledgement regression without duplicate write.
- [x] Two independent external systems reconcile lost acknowledgements without duplicate writes.
- [x] Proof integrity checks.
- [x] Pack compatibility manifest.
- [ ] Generalized compensation/saga engine.
- [ ] Real browser navigation against an external site where environment policy permits it.
- [ ] Distributed/remote workers.
- [ ] Studio / REST / SDK product surfaces.

## Verification rule

Do not classify a work item as completed solely because a tool returned success. Completion requires independent evidence matching the Work Contract's success criteria.

## Release posture

v0.5 remains a development milestone until its remaining compensation, browser, worker, and final merged-branch audit gates are independently verified.
