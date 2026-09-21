# Release Gate v3.4-dev - Executable Operator Benchmark

Date: 2026-09-21

## Acceptance gates

The v3.4 source-tree target is 171 required source paths before final closeout.

- [x] M001 research-to-artifact executable.
- [x] M002 HTTP discovery executable.
- [x] M003 bounded Git change capability and remote verification.
- [x] M004 induced ambiguity and reconciliation.
- [x] M005 capability substitution.
- [x] Machine-readable benchmark metrics.
- [x] Evidence completeness metric.
- [x] Duplicate-effect metric.
- [x] Ambiguous-outcome recovery metric.
- [x] Capability-substitution metric.
- [x] Git pack manifest and fixture.
- [x] Git pack regression coverage.
- [x] Operator benchmark regression coverage.
- [x] Feature CI #864.
- [x] PR #73 merge (`fe662d5bb5337bde18772f22864434935d59f66f`).
- [x] Merged-main CI #866.
- [ ] Final documentation/source-tree closeout CI.

## Verification rule

A mission counts as complete only when its required outcome is independently verified with evidence.


## Verified benchmark result

- M001-M005: 5/5 verified.
- verifiedCompletionRate: 1.0.
- falseDoneCount: 0.
- duplicateExternalEffectCount: 0.
- ambiguousOutcomeResolvedCount: 1.
- capabilitySubstitutionCount: 1.
- evidenceCompleteRate: 1.0.
- humanInterventionCount: 0.
- M004 POST count: 1; reconciliation: true.
- M005 primary calls: 2; substitution: true; fallback stored: true.
