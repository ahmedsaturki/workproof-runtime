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
- [x] Safe identifier validation.
- [x] Idempotent upsert capability using a declared conflict key.
- [x] Write risk declared as `local_write`.
- [x] Independent query verifier reads persisted state directly.
- [x] Independent upsert verifier reads persisted row state directly.
- [x] Evidence-bearing capability and verifier results.
- [x] Pack manifest and fixture metadata.
- [x] CLI registration for normal missions.
- [x] Feature CI #793 passes.
- [x] Merged-main CI #795 passes.
- [x] Final source-tree/documentation audit is recorded.

Additional capability families beyond the SQLite milestone remain separate follow-on work.

## Safety boundary

The pack is local-only. Read access accepts a single SELECT statement. Write access is constrained to parameterized upsert semantics and does not claim third-party exactly-once behavior.

## Verification evidence

- Feature head CI #793: success.
- Merge commit CI #795: success.
- Source-tree audit: 150 required paths, 0 missing.
- Dependency audit: 0 vulnerabilities.
- Full unit/integration suite: passed.
- Benchmark, demo, CLI, and live GitHub smoke: passed.

## Milestone result

**v3.1-dev SQLite database capability pack is verified on main.**
