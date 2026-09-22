# WorkProof Runtime v3.6.0-dev.1

Interoperability prerelease extending the verified v3.5.0-dev.1 product line.

## Included

- Optional MCP v2 stdio adapter built on the official Model Context Protocol TypeScript SDK.
- WorkProof MCP tools for capability discovery, Work Object reads, dispatch, resume, and cancel.
- Explicit mutation idempotency keys in MCP tool schemas.
- All MCP operations remain subordinate to the authenticated WorkProof Control Plane.
- End-to-end MCP protocol acceptance with the official client SDK.
- Packed-package MCP smoke from a freshly installed artifact and separate working directory.
- CI and release gates for MCP artifact verification.
- Control Plane API and product-readiness documentation for interoperability.

## Safety boundary

MCP is an adapter, not a second execution authority. Authentication, authorization, risk ceilings, idempotency, effect tracking, verification, reconciliation, recovery, and proof remain WorkProof responsibilities.

## Distribution

This prerelease is distributed through GitHub Release, source archive, npm-compatible package artifact, and GHCR. The package remains private to the npm registry.

## Verification

The release branch must pass full CI, release publication verification, container publication verification, and post-publication lineage checks before the release is considered verified.
