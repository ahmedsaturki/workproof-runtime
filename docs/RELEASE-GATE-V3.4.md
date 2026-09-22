# Release Gate v3.4-dev - Executable Operator Benchmark

Date: 2026-09-22

## Acceptance gates

The current dev.4 source tree contains **181 required paths**, enforced by `scripts/verify-source-tree.js`. The older dev.2 closeout recorded 179 paths.

### Benchmark and runtime

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
- [x] Final documentation/source-tree closeout CI #872.
- [x] Final closeout record verification CI #875.
- [x] Latest main CI for the current main commit: success.

### Distribution

- [x] Reproducible npm-compatible package artifact.
- [x] Reproducible source archive.
- [x] Machine-readable benchmark asset.
- [x] RELEASE-MANIFEST asset.
- [x] SHA256SUMS asset.
- [x] Published GitHub Release `v3.4.0-dev.4`.
- [x] Release target matches tag commit.
- [x] Published assets re-downloaded and SHA256-verified.
- [x] Published benchmark re-validated semantically.
- [x] GHCR image publication.
- [x] Version tag and immutable release-commit tag resolve to the same image digest.
- [x] OCI version/revision labels verified.
- [x] Published image `/health` smoke verified.
- [x] Localhost-bound production compose.
- [x] Production deployment runbook.

## Recorded distribution evidence

- GitHub Release id: 393311702.
- Release target: `c1c1f378d0e79acfc4ee22d5d2ca3fa389e8402d`.
- Release verification run: #30 (success).
- GHCR image: `ghcr.io/ahmedsaturki/workproof-runtime:3.4.0-dev.2`.
- GHCR digest: `sha256:2df71bf775272b9227979687de0c93d80f08814b83d7eb19e37e14dd63d8740b`.
- Container verification run: #27 (success).
- Main CI for the current main freeze commit: success.

## Verification rule

A mission counts as complete only when its required outcome is independently verified with evidence.

## Deployment boundary

The repository provides the deployable runtime and self-hosting instructions. A public Internet deployment still requires an externally provisioned host, DNS, TLS, authentication/authorization, and production secrets.

## Historical v3.4.0-dev.2 evidence

The preceding prerelease remains recorded for reproducibility:

- GitHub Release id: 393311702.
- Release target: `c1c1f378d0e79acfc4ee22d5d2ca3fa389e8402d`.
- GHCR digest: `sha256:2df71bf775272b9227979687de0c93d80f08814b83d7eb19e37e14dd63d8740b`.

## Current v3.4.0-dev.4 distribution evidence

- GitHub Release id: 393378852.
- Release target: `fcff799b77404f99ee0c17929f44cd2e4e8d47bf`.
- Release verification: success.
- GHCR image: `ghcr.io/ahmedsaturki/workproof-runtime:3.4.0-dev.4`.
- GHCR digest: `sha256:1500730c2c2c9dc0d6da24ca2dd1de4948699e4f2956768d39107b91d753efba`.
- Immutable commit image tag: `fcff799b77404f99ee0c17929f44cd2e4e8d47bf`.
- Container verification: success.
- Published image health and anonymous pull: success.
