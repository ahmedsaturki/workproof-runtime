# Release Gate v3.2-dev - Declarative Data Transformation

Date: 2026-09-21

## Acceptance gates

- [x] No new npm runtime dependency.
- [x] Declarative JSON transformation capability.
- [x] Primitive-equality filter.
- [x] Explicit field projection.
- [x] Stable sort.
- [x] Output limit capped at 500.
- [x] Input size/depth/item bounds.
- [x] Selected-field count bound.
- [x] Safe identifier validation.
- [x] Fail-closed malformed roots.
- [x] No user-provided JavaScript, SQL, templates, or expressions.
- [x] Deterministic output.
- [x] Evidence-bearing capability result.
- [x] Independent verifier re-reads persisted output.
- [x] Pack manifest and fixture.
- [x] CLI registration.
- [x] Feature CI #798.
- [x] PR #69 merged.
- [x] Merged-main CI #800.
- [x] Final documentation/source-tree audit CI after this document is recorded.

## Safety boundary

The transformation specification is declarative and allowlisted. It cannot execute arbitrary code. The persisted output is local-only and the operation is classified `local_write`.

## Milestone result

**v3.2-dev declarative data transformation is verified by the implementation and merged-main CI; final documentation CI remains the last recordkeeping gate.**
