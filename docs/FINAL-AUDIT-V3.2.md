# Final Audit v3.2 - Declarative Data Transformation

Date: 2026-09-21

## Release identity

- Feature branch: `feature/v3.2-data-transform`
- Feature head: `37f895c69d1d7aa56f6247e64f1a5bada7471c2a`
- Feature CI #798: success
- PR #69: merged
- Main merge commit: `c3562b96df23c1c8d500c48e0591833e96236306`
- Merged-main CI #800: success
- Package version: `3.2.0-dev`

## Functional verification

The v3.2 implementation provides:
- bounded local JSON transformation
- filter/project/sort/limit semantics
- deterministic stable ordering
- explicit resource bounds
- safe field validation
- no arbitrary code or expression execution
- persisted output artifact
- evidence-bearing capability result
- independent output verification
- CLI registration
- manifest and fixture

## Regression and security verification

Merged-main CI #800 passed:
- Chromium availability and CDP preflight
- npm install
- dependency security audit
- source-tree audit: 155 required implementation paths, 0 missing
- strict TypeScript build
- retention lifecycle suite
- full unit/integration suite
- benchmark
- demo
- CLI proof verification
- CLI mission execution
- live GitHub smoke

## Safety verification

- input file is bounded to 2 MiB
- input depth is bounded to 20
- input item count is bounded to 10,000
- output is bounded to 500 rows
- selected fields are bounded to 50
- field identifiers use a safe grammar
- filter values are primitive-only
- no JavaScript/SQL/template/expression execution is accepted

## Correctness boundary

The capability receipt is not proof. The verifier re-reads the persisted output artifact and recomputes the deterministic transformation.

The capability is local-only and classified `local_write`; it does not create a new authorization plane or claim remote exactly-once semantics.

## Final result

**v3.2-dev declarative data transformation is verified on main.**

The implementation gate is satisfied by feature CI #798 and merged-main CI #800. The final documentation/source audit is recorded by the CI run generated from this commit.
