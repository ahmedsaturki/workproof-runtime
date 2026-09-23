# WorkProof Runtime v3.8.12

## Security hardening release candidate

v3.8.12 is the next release candidate after the published v3.8.11 stable release. It carries post-release security hardening for HTTP-to-file data-flow boundaries, safe transport serialization, browser runtime evaluation escaping, external-topology image selection, release-lineage API boundaries, and the associated regression coverage.

### Included hardening

- stable public error responses for A2A, Studio, and Control Plane while retaining detailed private audit information;
- validated trust-snapshot serialization before local persistence and registry transport;
- browser Runtime.evaluate string escaping for delimiter-sensitive values;
- validated and atomic web-discovery artifact materialization;
- constrained registry proof/trust transport payloads;
- fixed repository/tag endpoints for release-lineage verification;
- constrained release-image selection to the official WorkProof GHCR repository and package version;
- regression coverage for the affected trust boundaries and malformed network data;
- repository-hygiene regression coverage preventing ChatGPT-only UI/citation markers from entering tracked text files.

### Verification target

The v3.8.12 candidate must pass from a clean release branch:

- Linux `verify`
- Windows full compatibility
- Windows Chromium/CDP compatibility
- Windows private filesystem security
- CodeQL JavaScript/TypeScript + GitHub Actions
- Dependency Review
- Solo Governance live ruleset verification
- full unit/integration suite
- benchmark and demo
- release asset SHA256 verification
- container build, runtime, persistence, external-topology, anonymous-pull, and provenance verification

### Release evidence requirements

Publication is valid only when the release branch descends from the final merged `main`, package and lock versions match `v3.8.12`, all required verification workflows succeed, the GitHub Release and tag resolve to the same release commit, five release assets and their SHA256 manifest verify, and the published GHCR version tag and commit-addressed image resolve to the same digest.

The published `v3.8.11` stable release remains the rollback baseline until `v3.8.12` completes publication and verification.
