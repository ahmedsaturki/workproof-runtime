# WorkProof Runtime v3.4.0-dev.2

Coherent prerelease for the verified v3.4 operator benchmark and self-host distribution path.

## Release identity

- GitHub Release id: 393311702
- tag: `v3.4.0-dev.2`
- target commit: `c1c1f378d0e79acfc4ee22d5d2ca3fa389e8402d`
- release verification run: #30 (success)
- final main CI: #912 (success)

The release assets were published from the release target and then re-downloaded and verified after publication.

## Included

- M001-M005 executable benchmark with independent verification
- hardened local Git path containment
- reproducible source and npm-compatible package distribution
- post-publication GitHub Release asset verification
- GHCR container distribution with OCI provenance
- image tag/digest consistency verification
- OCI version/revision verification against the release target
- published-image `/health` smoke test
- localhost-bound production compose and deployment runbook

## Benchmark evidence

- 5/5 benchmark cases verified
- verifiedCompletionRate: 1.0
- falseDoneCount: 0
- duplicateExternalEffectCount: 0
- ambiguousOutcomeResolvedCount: 1
- capabilitySubstitutionCount: 1
- evidenceCompleteRate: 1.0
- humanInterventionCount: 0

## GHCR evidence

- image: `ghcr.io/ahmedsaturki/workproof-runtime:3.4.0-dev.2`
- digest: `sha256:2df71bf775272b9227979687de0c93d80f08814b83d7eb19e37e14dd63d8740b`
- container verification run: #27 (success)
- anonymous GHCR pull: success
- version tag and immutable `c1c1f378d0e79acfc4ee22d5d2ca3fa389e8402d` tag matched by digest

## Scope boundary

This is a prerelease. `package.json` remains `private: true`; no npm registry publication is claimed.

The repository provides a self-hostable production container and localhost-bound compose configuration. It does not claim that a public production host, DNS, TLS, authentication/authorization, or production secrets have been provisioned.
