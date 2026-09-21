# WorkProof Runtime v3.4.0-dev

Development release for the verified executable operator benchmark milestone.

## Release scope

M001-M005 are executable and independently verified:

- M001 research-to-artifact
- M002 HTTP discovery
- M003 bounded local Git mutation with controlled remote verification
- M004 induced accepted-but-unacknowledged HTTP effect with reconciliation and duplicate prevention
- M005 repeated primary ambiguity with audited compatible capability substitution

## Recorded evidence

- 5/5 benchmark cases verified
- verifiedCompletionRate: 1.0
- falseDoneCount: 0
- duplicateExternalEffectCount: 0
- ambiguousOutcomeResolvedCount: 1
- capabilitySubstitutionCount: 1
- evidenceCompleteRate: 1.0
- humanInterventionCount: 0
- feature CI #864: success
- merged-main CI #866: success
- final documentation/source-tree verification #875: success
- latest main verification #876 attempt 2: success

## Distribution contents

The release workflow runs `npm run check` before creating the release and publishes:

- `operational-reality-core-3.4.0-dev.tgz` — npm-compatible source package; the repository remains `private: true`, so this is file-based distribution, not npm registry publication.
- `workproof-runtime-v3.4.0-dev.tar.gz` — reproducible source archive.
- `workproof-benchmark-v3.4.0-dev.json` — machine-readable benchmark result.
- `RELEASE-MANIFEST.txt` and `SHA256SUMS.txt` — distribution metadata and integrity hashes.

This is a prerelease. No production service deployment or external runtime hosting is implied by this release.
