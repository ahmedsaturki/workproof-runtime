# WorkProof Runtime v3.8.4

## Container supply-chain and operations hardening

v3.8.4 preserves the v3.8.3 runtime contract and adds immutable container-base provenance plus an explicit production resource envelope.

## Included

- Docker build and runtime stages use the same immutable Node 24.21.0 Trixie slim image digest.
- CI, Release, and Container workflows reject mutable Docker base references.
- Production Compose enables an init process, bounded shutdown, CPU/memory/PID limits, and bounded JSON log rotation.
- Compose smoke verifies the rendered resource/log envelope in addition to restart and persistence.
- Existing v3.8.3 Studio network-boundary, proof, recovery, idempotency, Control Plane, MCP, A2A, OTLP, and release-lineage behavior remains intact.

## Verification

The release is valid only after the complete CI suite, GitHub Release verification, GHCR container verification, runtime smoke, Compose restart/persistence/resource checks, external topology, anonymous pull, and published-lineage reconciliation all succeed.

## Container base provenance

- base: `docker.io/library/node:24.21.0-trixie-slim`
- index digest: `sha256:8ec5d7557396cfe32d21c3f9c13072355ceab22b584578ca4bb28af31120cffe`

The base digest was checked against the current Docker Official Image metadata at release preparation time.
