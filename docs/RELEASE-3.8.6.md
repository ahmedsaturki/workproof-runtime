# WorkProof Runtime v3.8.6

## Distribution integrity and release-lineage hardening

v3.8.6 is a patch release following the verified v3.8.5 stable distribution.

## Included

- Correct the Dockerfile OCI metadata label block so every `LABEL` instruction is represented as a real Dockerfile instruction line.
- Harden `verify-container-base.js` to reject literal escaped-newline sequences before Docker instructions.
- Harden `verify-main-release-state.js` so a main-branch source/distribution drift beyond the published release requires a version bump instead of silently remaining under the old release version.
- Align the contributor development baseline with v3.8.5 before this patch release.
- Preserve the WorkProof Runtime execution, verification, reconciliation, recovery, idempotency, proof, Control Plane, MCP, A2A, OTLP, Studio, and network-boundary contracts verified in v3.8.5.

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
