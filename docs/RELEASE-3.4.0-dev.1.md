# WorkProof Runtime v3.4.0-dev.1

Corrected prerelease for the verified v3.4 executable operator benchmark and reproducible distribution pipeline.

## Verification

- M001-M005: 5/5 verified.
- verifiedCompletionRate: 1.0.
- falseDoneCount: 0.
- duplicateExternalEffectCount: 0.
- ambiguousOutcomeResolvedCount: 1.
- capabilitySubstitutionCount: 1.
- evidenceCompleteRate: 1.0.
- humanInterventionCount: 0.
- Full feature CI #864: success.
- Merged-main CI #866: success.
- Final closeout CI #875: success.
- Latest main verification before release packaging: success.
- Container build/push/runtime smoke: verified on the v3.4.0-dev container line.

## Distribution

This prerelease aligns:

- package version: 3.4.0-dev.1
- Git tag: v3.4.0-dev.1
- reproducible source bundle
- npm-compatible tarball
- machine-readable benchmark result
- SHA256 integrity manifest
- GHCR image: ghcr.io/ahmedsaturki/workproof-runtime:3.4.0-dev.1

The repository remains `private: true`; no npm registry publication is claimed.

The Studio container is an operator distribution target. No managed public production host is implied by this prerelease.
