# WorkProof Runtime v3.8.9

## Current-spec and governance hardening

v3.8.9 is a documentation-focused patch release following the verified v3.8.8 stable distribution.

## Included

- Promote `SPEC.md` from the historical v3.4-dev heading to the current v3.8.9 specification baseline while explicitly retaining v3.4 acceptance material as historical records.
- Add `docs/GITHUB-GOVERNANCE.md` documenting the verified GitHub-side `main` protection state and the production-grade branch-protection requirements.
- Keep the WorkProof Runtime execution, verification, reconciliation, recovery, idempotency, proof, Control Plane, MCP, A2A, OTLP, Studio, container, and local-first product contracts unchanged.

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
