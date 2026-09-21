# Release Gate v3.2-dev - Declarative Data Transformation

Date: 2026-09-21

## Scope

Add a local declarative JSON transformation capability without arbitrary code execution or new runtime dependencies.

## Acceptance gates

- [x] No new npm runtime dependency.
- [x] Filter by declared top-level field and primitive equality.
- [x] Projection through an explicit allowlist of fields.
- [x] Stable sorting by an explicit field and direction.
- [x] Output limiting to a maximum of 500 rows.
- [x] Input size, depth, item-count, and field-count bounds.
- [x] Fail-closed malformed roots and unsafe field names.
- [x] No user-provided JavaScript or expression execution.
- [x] Deterministic output.
- [x] Evidence-bearing capability result.
- [x] Independent verifier re-reads the generated artifact and validates deterministic content.
- [x] Pack compatibility manifest and fixture.
- [x] CLI registration.
- [ ] Feature CI.
- [ ] Merged-main CI.

## Safety boundary

The transform specification is declarative. It does not evaluate user-provided code, SQL, templates, or expressions. The output file is a local side effect and is classified `local_write`.

## Verification requirement

The capability receipt is not proof. The verifier re-reads the persisted output artifact and checks its content against the declared transformation.
