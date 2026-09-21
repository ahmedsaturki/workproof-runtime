# Release Gate v3.1-dev - SQLite Database Capability Pack

Date: 2026-09-21

## Scope

Add a first-class local SQLite capability family using Node 24's built-in `node:sqlite`, with bounded read access, explicit local writes, independent verification, and fixture-backed compatibility metadata.

## Acceptance gates

- [x] No new npm runtime dependency.
- [x] SQLite file-backed capability integration.
- [x] SELECT-only read capability.
- [x] Bounded result sets (maximum 500 rows).
- [x] Bounded SQL and parameter inputs.
- [x] Idempotent upsert capability using a declared conflict key.
- [x] Write risk declared as `local_write`.
- [x] Independent query verifier reads persisted state directly.
- [x] Independent upsert verifier reads persisted row state directly.
- [x] Evidence-bearing capability and verifier results.
- [x] Pack manifest and fixture metadata.
- [x] CLI registration for normal missions.
- [ ] Merged-main CI for v3.1.

## Safety boundary

The pack is local-only. Read access accepts a single SELECT statement. Write access is constrained to parameterized upsert semantics and does not claim third-party exactly-once behavior.

## Verification requirement

A capability receipt is not sufficient proof. The verifier must observe persisted SQLite state independently.
