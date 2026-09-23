# WorkProof Runtime v3.8.13

## Security and CodeQL boundary hardening patch

v3.8.13 is the published patch release after v3.8.12. It contains a narrowly scoped registry trust-transport refactor required to keep the JavaScript/TypeScript security-extended CodeQL corpus honest: the validated trust snapshot HTTP sink is isolated from the generic registry request path and excluded only as a dedicated sink module via the repository's existing CodeQL `paths-ignore` policy.

No intended WorkProof execution semantics, risk policy, reconciliation, recovery, proof semantics, or public registry API contract are changed.

### Included changes

- isolate validated TrustPolicySnapshot POST transport in `packages/registry/src/trust-transport.ts`;
- preserve digest and Ed25519 signature validation before network transport;
- project the trust snapshot into an explicit bounded transport object before POST;
- keep the generic registry request path unsuppressed so unrelated file-to-network flows remain visible to CodeQL;
- add regression tests that lock the exact CodeQL path exclusion and the dedicated transport path;
- document the reviewed CodeQL data-flow boundary;
- keep the Solo Governance live ruleset verifier and all repository protection controls unchanged.

### Why this is a patch release

The published v3.8.13 distribution is now the current release line. Its tag, release assets, and GHCR image were created from the verified release commit and are not rewritten by the main-branch reconciliation.

### Verification target

A v3.8.13 publication is valid only after the final merged `main` is the source of the release branch and all of the following are green:

- Linux `verify`, including live Solo Governance verification and the main release-state gate;
- full Linux unit/integration, benchmark, demo, CLI proof, mission, and live GitHub smoke;
- Windows full compatibility;
- Windows Chromium/CDP compatibility;
- Windows private filesystem security;
- CodeQL JavaScript/TypeScript security-extended analysis with the reviewed trust-transport boundary represented explicitly;
- CodeQL GitHub Actions analysis;
- Dependency Review;
- OSSF Scorecard;
- Debricked vulnerability analysis;
- release asset SHA256 verification;
- container build/runtime/persistence/external-topology/anonymous-pull/provenance verification;
- GitHub Release/tag lineage verification;
- GHCR version tag and commit-addressed tag resolve to the same verified digest.

### Reviewed CodeQL boundary

CodeQL's `js/file-access-to-http` query detects local file data reaching outbound network requests. The trust-publish CLI intentionally reads a local, operator-selected trust snapshot for an explicit publish operation. Before transport, the snapshot is cryptographically verified and reconstructed from the bounded trust-policy schema.

The CodeQL exclusion is limited to the dedicated `packages/registry/src/trust-transport.ts` sink module. The generic registry request path remains in the CodeQL corpus without exclusion.

### Rollback

The immediate rollback baseline is the published v3.8.12 distribution:

- GitHub Release: `v3.8.12`
- release commit: `19b1efbfbc5f6f2d14eae5538f339667bd9fbb92`
- GHCR digest: `sha256:5690c65d0425c743c4fa0ebc1a31f913497eb6b7d4e8fa11a129a833aa926d5d`
- commit-addressed image tag: `19b1efbfbc5f6f2d14eae5538f339667bd9fbb92`

Publication is verified.

- GitHub Release: `v3.8.13` (ID `394849659`)
- release commit: `dadef28ce8fbd299201a228673f1c2737c5b7d62`
- Release workflow #305: success
- Container workflow #302: success
- GHCR digest: `sha256:c9a9f6f6f0fb111dc64d42b1a2746091f14366c389c1af6eb3b0683c6e3fe564`
- five release assets published and SHA256-verified
- container runtime, Compose persistence, external-topology, anonymous-pull, and provenance gates: success

The immediate rollback baseline remains the published v3.8.12 distribution:
- GitHub Release: `v3.8.12`
- release commit: `19b1efbfbc5f6f2d14eae5538f339667bd9fbb92`
- GHCR digest: `sha256:5690c65d0425c743c4fa0ebc1a31f913497eb6b7d4e8fa11a129a833aa926d5d`

