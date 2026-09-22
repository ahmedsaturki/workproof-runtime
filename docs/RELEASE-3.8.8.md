# WorkProof Runtime v3.8.8

## Release-state source-of-truth hardening

v3.8.8 is a patch release following the verified v3.8.7 stable distribution.

## Included

- Carry the shallow-checkout-compatible release-lineage verification into the main source of truth.
- Make `verify-main-release-state.js` detect a shallow repository and run `git fetch --no-tags --prune --unshallow origin` before comparing the published release commit.
- Add regression coverage for shallow-repository detection, unshallow recovery, and release-commit availability.
- Preserve the WorkProof Runtime execution, verification, reconciliation, recovery, idempotency, proof, Control Plane, MCP, A2A, OTLP, Studio, and network-boundary contracts verified in v3.8.7.

## Verification

The release is valid only after the complete release and container verification chain succeeds, including:

- clean install and security checks;
- immutable container-base verification;
- Dockerfile validation and image build;
- strict TypeScript build;
- packed CLI/control-plane/MCP/A2A smoke;
- operator diagnostics;
- external topology with TLS/authentication/backup/restore/rollback;
- published release lineage verification;
- full unit/integration suite;
- benchmark and demo;
- CLI proof verification;
- representative missions;
- Live GitHub integration smoke.

## Container base

- base: `docker.io/library/node:24.21.0-trixie-slim`
- index digest: `sha256:8ec5d7557396cfe32d21c3f9c13072355ceab22b584578ca4bb28af31120cffe`

No new public-host, DNS, certificate, or third-party runtime dependency is introduced by this patch release.
