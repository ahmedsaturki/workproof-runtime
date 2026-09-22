# WorkProof Runtime v3.8.2

Patch release carrying the post-v3.8.1 network-boundary hardening into the stable distribution.

## Included

- Studio refuses non-loopback binding; Studio remains localhost-only and is intended to sit behind an authenticated TLS edge for external exposure.
- Registry refuses non-loopback binding unless an explicit authentication policy is configured.
- Regression tests cover both network-boundary invariants.
- Distribution documentation is reconciled to the v3.8.1 published artifact lineage before this release.
- Existing v3.8.1 execution-policy, idempotency, recovery, proof, Studio, Control Plane, MCP, A2A, and OTLP surfaces remain intact.

## Verification

The release branch must pass the complete CI/build/security/browser/package/integration/benchmark/demo/CLI/GitHub validation chain, followed by GitHub Release publication and GHCR image verification.

## Safety boundary

This release does not imply public DNS, TLS certificates, production secrets, or a hosted Control Plane. External exposure remains a deployment-time concern with authentication and TLS required at the edge.


## Supersession record

The v3.8.2 GitHub Release was published, but its Container workflow failed at runtime health verification because the Studio loopback guard conflicted with the container's required internal interface binding. The release is retained for provenance and superseded by v3.8.3; v3.8.2 must not be used as the production rollback target.
