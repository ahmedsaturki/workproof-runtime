# WorkProof Runtime v3.4.0-dev.2

Coherent prerelease for the verified v3.4 operator benchmark and self-host distribution path.

## Included

- M001-M005 executable benchmark with independent verification
- hardened local Git path containment
- reproducible source and npm-compatible package distribution
- post-publication GitHub Release asset verification
- GHCR container distribution with OCI provenance
- image tag/digest consistency verification
- published-image `/health` smoke test
- localhost-bound production compose and deployment runbook

## Baseline evidence

- 5/5 benchmark cases verified
- verifiedCompletionRate: 1.0
- falseDoneCount: 0
- duplicateExternalEffectCount: 0
- ambiguousOutcomeResolvedCount: 1
- capabilitySubstitutionCount: 1
- evidenceCompleteRate: 1.0
- humanInterventionCount: 0

This is a prerelease. `package.json` remains `private: true`; no npm registry publication is claimed.


Release branch baseline: c1c1f378d0e79acfc4ee22d5d2ca3fa389e8402d
