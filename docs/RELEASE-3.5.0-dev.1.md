# WorkProof Runtime v3.5.0-dev.1

Product-surface prerelease extending the verified v3.4.0-dev.12 lineage.

## Included

- Authenticated control-plane runtime identity with explicit API protocol version.
- Authenticated capability inventory at `GET /v1/capabilities`, with deterministic sorting and descriptive risk metadata.
- SDK `listCapabilities()` surface for operator/developer integrations.
- Studio capability-registry visibility through the connected authenticated control plane.
- Robust runtime-version discovery from the installed package root.
- Packed control-plane smoke that executes the actual packaged distribution from a separate working directory.
- Negative authorization coverage proving capability discovery does not bypass the control-plane read permission.
- Hardened Chromium/CDP preflight for slow CI runner startup.
- Explicit Control Plane API V1 contract documentation.

## Product boundary

Capability discovery is metadata, not authorization. WorkProof outcome contracts, risk ceilings, policy, idempotency, effect tracking, independent verification, reconciliation, recovery, and proof remain authoritative.

This is a prerelease. The public npm registry remains intentionally unused because the repository package is private. Supported distribution channels are GitHub Releases, source archive, npm-compatible package artifact, and GHCR container.

## Verification target

The release branch must pass the complete repository CI gate and the release/container publication gates before publication is treated as verified.
