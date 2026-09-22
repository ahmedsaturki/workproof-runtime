# WorkProof Runtime v3.8.7

## Release-state verification hardening

v3.8.7 is a patch release following the verified v3.8.6 stable distribution.

## Included

- Harden `verify-main-release-state.js` so release-lineage comparison works from the shallow Git checkout used by CI by verifying and fetching the published release commit when it is not locally available.
- Add regression assertions covering shallow-clone recovery in the release-state verification path.
- Preserve the WorkProof Runtime execution, verification, reconciliation, recovery, idempotency, proof, Control Plane, MCP, A2A, OTLP, Studio, and network-boundary contracts verified in v3.8.6.

## Verification

The release-state verifier is compatible with the repository's shallow CI checkout: it checks whether the published release commit is locally available and fetches that commit by SHA when required before comparing post-release drift.

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
