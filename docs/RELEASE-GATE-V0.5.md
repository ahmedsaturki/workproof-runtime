# Release Gate v0.5-dev - Real Integration and External-Effect Safety

Date: 2026-09-21

## Scope

This gate moves WorkProof Runtime beyond purely local adapters and proves that external integration semantics survive realistic failures.

## Acceptance gates

### Integration
- [x] GitHub REST repository read capability.
- [x] Independent repository-state verifier.
- [x] GitHub Actions live smoke against the real repository.

### External write safety
- [x] GitHub issue creation capability declared as external_write.
- [x] Runtime approval gate blocks execution before the POST.
- [x] Deterministic idempotency marker is mandatory.
- [x] Lost acknowledgement is reconciled from external state before retry.
- [x] Local fault injection proves one POST produces one issue.

### Proof
- [x] Evidence references are emitted for the resulting GitHub issue.
- [x] Proof bundle can be canonically hashed with SHA-256.
- [x] Tampered proof content fails digest verification.
- [x] GitHub pack compatibility is declared in a manifest and exercised by tests.

### Remaining for milestone closure
- [ ] Two-system coordinated fault injection and reconciliation.
- [ ] Real browser navigation where environment policy permits it.
- [ ] Reusable compensation/saga primitives.
- [ ] Worker/process boundary tests.
- [ ] Final release audit on the merged main branch.

## Release rule

The presence of a successful API receipt alone never closes an external-work item. The final Work Object must have independent verification evidence matching its success criteria.
