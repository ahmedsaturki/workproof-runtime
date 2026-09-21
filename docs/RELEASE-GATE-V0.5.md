# Release Gate v0.5-dev - Verified Integration Milestone

Date: 2026-09-21

## Verified on merged main

### Integration
- [x] GitHub REST repository read capability.
- [x] Independent repository-state verifier.
- [x] GitHub Actions live smoke against the real repository.

### External-write safety
- [x] GitHub issue creation declared as external_write.
- [x] Runtime approval gate blocks execution before the POST.
- [x] Deterministic idempotency marker is mandatory.
- [x] Lost acknowledgement reconciles from external state before retry.
- [x] Local fault injection proves one POST produces one issue.
- [x] Two independent systems each reconcile a lost acknowledgement without duplicate writes.
- [x] Persisted acknowledged effects are not re-executed after resume.
- [x] External inputs are validated before network access.

### Proof
- [x] Evidence references are emitted for resulting external state.
- [x] Proof bundles can be canonically hashed with SHA-256.
- [x] Tampered proof content fails digest verification.
- [x] Pack compatibility is declared and exercised by fixtures.

### Main verification
- [x] Merged main CI run #34 passed.
- [x] 28/28 automated tests passed.
- [x] benchmark passed.
- [x] demo and CLI proof/mission checks passed.
- [x] live GitHub read-only smoke passed.

## Explicit limits

- Marker-based GitHub idempotency is reconciliation-based, not an atomic exactly-once guarantee for concurrent independent writers.
- SHA-256 integrity is not a digital signature.
- CI does not perform an irreversible live third-party write.
- Local browser acceptance does not establish external-site browser coverage.
- General saga/compensation, remote workers, control plane, Studio/API/SDK, and marketplace/registry are not part of this milestone.

## Milestone result

**v0.5-dev integration milestone: verified.**

This is a development milestone, not a claim of full production readiness.
