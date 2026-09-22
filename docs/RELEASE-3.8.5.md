# WorkProof Runtime v3.8.5

## Post-release verification and toolchain hardening

v3.8.5 is a patch release following the verified v3.8.4 stable distribution.

## Included

- Correct `verify-main-release-state.js` exit-code propagation so a successful published-lineage verification remains successful instead of being coerced to exit code 1.
- Add regression coverage for the release-state verifier exit-code path.
- Update `actions/upload-artifact` to immutable commit-pinned v7.0.1 in CI.
- Upgrade the TypeScript toolchain to 7.0.2.
- Migrate the compiler configuration to `module: NodeNext` and `moduleResolution: NodeNext`, required for TypeScript 7 compatibility.
- Preserve the WorkProof Runtime execution, verification, reconciliation, recovery, idempotency, proof, Control Plane, MCP, A2A, OTLP, Studio, and network-boundary contracts verified in v3.8.4.

## Verification

The release is valid only after the complete release and container verification chain succeeds, including:

- clean install and security checks;
- immutable container-base verification;
- strict TypeScript build;
- packed CLI/control-plane/MCP smoke;
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
