# Final Audit v3.4 - Executable Operator Benchmark

Date: 2026-09-21

## Release identity

- Feature branch: feature/v3.4-operator-benchmark
- Scope: executable M001-M005 benchmark with induced partial failures
- Implementation merge: `fe662d5bb5337bde18772f22864434935d59f66f`
- Feature CI: #864 (success)
- Merged-main CI: #866 (success)
- Final closeout commit: `b32913e033c178d15f170e004ef79dff9834911a`
- Final documentation/source-tree closeout CI: #872 (success)

## Verification target

- source-tree completeness
- dependency security audit
- Chromium/CDP preflight
- strict TypeScript build
- retention lifecycle suite
- full sequential unit/integration suite
- Git capability regression
- operator benchmark regression
- benchmark executable
- demo
- CLI proof verification and mission execution
- live GitHub integration smoke
- feature CI
- merged-main CI
- final documentation/source-tree closeout

## Required behavior

- all five missions independently verified
- M004 reconciles the accepted-but-unacknowledged write without a duplicate POST
- M005 explicitly substitutes after repeated primary ambiguity
- every mission carries evidence
- benchmark reports deterministic outcome metrics

## Status

**v3.4 is fully verified through implementation, merge, benchmark, documentation, source-tree closeout, and verified prerelease distribution.**

## Recorded benchmark outcome

- 5/5 missions verified.
- verifiedCompletionRate: 1.0.
- falseDoneCount: 0.
- duplicateExternalEffectCount: 0.
- ambiguousOutcomeResolvedCount: 1.
- capabilitySubstitutionCount: 1.
- evidenceCompleteRate: 1.0.
- humanInterventionCount: 0.
- M004 produced exactly one POST and reconciled the existing effect.
- M005 used two primary attempts, then substituted a compatible fallback and independently verified the stored outcome.

## Distribution closeout

- GitHub Release: `v3.4.0-dev.2`, release id 393311702.
- Release target: `c1c1f378d0e79acfc4ee22d5d2ca3fa389e8402d`.
- Post-publication release verification run #21: success.
- Release assets: 5/5, SHA256 re-check: success.
- Published benchmark semantic verification: success.
- GHCR image: `ghcr.io/ahmedsaturki/workproof-runtime:3.4.0-dev.2`.
- GHCR digest: `sha256:490dcb17e37c0f9a9cdbf7f30624d7d393f9fdb59b911cc9e86b9de681195617`.
- Container verification run #15: success.
- OCI version/revision verification: success.
- Published-image `/health` smoke: success.
- Latest main CI #893: success.

The public production-host portion remains an external infrastructure boundary; the repository includes the deployable container, compose configuration, and runbook but does not claim to have provisioned a public host, DNS, TLS, authentication, or production secrets.
