# WorkProof Runtime

Outcome-first digital work runtime: execute real work, reconcile external effects, verify outcomes, preserve proof, manage proof lifecycle, recover execution after worker loss, expose authenticated control, and provide a local operational Studio.

## Current status

**v3.8.5 is the current stable release.**

v3.8.5 preserves the verified v3.8.3 runtime contract and adds immutable container-base provenance plus an explicit production resource/log envelope.

The v3.4 line established the executable operator benchmark across research, HTTP discovery, Git mutation, ambiguous external-effect reconciliation, and capability substitution. Later releases added local product surfaces, proof compatibility, recovery, Control Plane safety, MCP/A2A interoperability, OTLP audit export, diagnostics, network-boundary hardening, and reproducible distribution.

## Core loop

Goal -> Outcome Contract -> Capability -> Execute -> Observe/Reconcile -> Verify -> Recover/Substitute -> Deliver -> Proof -> Retain -> Control -> Compensate

## v3.8.5 release evidence

- GitHub Release: `v3.8.5` (ID `393990944`)
- release commit: `bcf951fdf772ae8aa843671e3bf7ae1ba765471b`
- Release workflow #218: success
- Container workflow #215: success
- GHCR image: `ghcr.io/ahmedsaturki/workproof-runtime:3.8.5`
- GHCR digest: `sha256:0efe2ff7d2a2b97707c32d91523d38a0932e796ea417d38b0d4a1fdb8d1315a5`
- immutable image tag: `bcf951fdf772ae8aa843671e3bf7ae1ba765471b`
- rollback: v3.8.1 / `sha256:7908cc6a4473495b7b5c51f1a0527815f0a8ff0c6d9eaf20ebf1ddfb0479b5d0`
- five release assets published and SHA256-verified
- anonymous GHCR pull: verified
- runtime health: verified
- production Compose restart/persistence: verified
- disposable external TLS/auth/backup/restore/rollback topology: verified

### v3.8.5 hardening

- Docker build/runtime stages use immutable `node:24.21.0-trixie-slim` digest `sha256:8ec5d7557396cfe32d21c3f9c13072355ceab22b584578ca4bb28af31120cffe`.
- CI, Release, and Container workflows reject mutable Docker base references.
- Production Compose uses init, 10s stop grace, 1 CPU, 1 GiB RAM, 512 PIDs, and 10 MiB × 3 JSON log rotation.
- Compose smoke verifies the resource/log envelope in addition to restart and persistence.

## Benchmark

M001-M005: **5/5 verified**.

- verifiedCompletionRate: 1.0
- falseDoneCount: 0
- duplicateExternalEffectCount: 0
- ambiguousOutcomeResolvedCount: 1
- capabilitySubstitutionCount: 1
- evidenceCompleteRate: 1.0
- humanInterventionCount: 0

M004 reconciles an external effect whose acknowledgement was lost without duplicating the effect. M005 uses bounded capability substitution and independently verifies the stored outcome.

## Product surfaces

- Local WorkProof Studio
- packaged `workctl` CLI
- durable Work Objects with restart/resume
- portable proof export/verify/import and explicit compatibility policy
- authenticated Control Plane with execution-policy and idempotency safety
- capability inventory and Studio registry visibility
- MCP v2 stdio adapter
- A2A 1.0 JSON-RPC adapter and Agent Card
- dependency-free OTLP/HTTP JSON audit export
- operator diagnostics via `workctl doctor` and `/ready`
- local persistent work/proof storage
- reproducible source and container distributions

The runtime remains the authority for execution, risk policy, effects, verification, reconciliation, recovery, and proof. Adapters do not create a parallel execution authority.

## Distribution and operation

### GitHub Release

The v3.8.5 release publishes:

- `operational-reality-core-3.8.5.tgz`
- `workproof-runtime-v3.8.5.tar.gz`
- `workproof-benchmark-v3.8.5.json`
- `RELEASE-MANIFEST.txt`
- `SHA256SUMS.txt`

The release pipeline re-downloads published assets, verifies SHA256 sums, verifies tag/commit lineage, validates benchmark semantics, and verifies the publication state.

### GHCR container

`ghcr.io/ahmedsaturki/workproof-runtime:3.8.5@sha256:0efe2ff7d2a2b97707c32d91523d38a0932e796ea417d38b0d4a1fdb8d1315a5`

The immutable commit tag is `bcf951fdf772ae8aa843671e3bf7ae1ba765471b`.

### Self-hosted runtime

The repository includes:

- `Dockerfile`
- `compose.production.yaml`
- `docs/CONTAINER-RUNTIME.md`
- `docs/PRODUCTION-DEPLOYMENT.md`

Production Compose pins the exact verified v3.8.5 image digest, binds the host port to localhost, persists `./work-runs`, and applies bounded resources/logs. The Control Plane is the authenticated mutation boundary.

A public deployment requires an explicitly configured host, TLS reverse proxy, authentication/authorization, and production secrets. Those external resources are intentionally not claimed as provisioned by this repository.

`package.json` remains `private: true`; npm registry publication is intentionally not claimed. Source and container distributions are the supported release artifacts.

## Local-first operator quick start

Requirements: Node.js 24.15+.

### From source

```bash
npm ci
npm run build
node dist/packages/cli/src/index.js run examples/missions/research-local.json
```

A durable Work Object is created under `./work-runs` and a portable proof file is emitted. A persisted Work Object can be resumed after interruption:

```bash
node dist/packages/cli/src/index.js resume <work-id> examples/missions/research-local.json
```

### Local Control Plane

```bash
WORKPROOF_CONTROL_PLANE_PORT=8789 node dist/apps/control-plane.js
```

The default bind is loopback. Non-loopback binding is refused unless an explicit auth policy is configured. Mutations require durable idempotency keys when the control-plane ledger is enabled.

### Local Studio

```bash
node dist/apps/studio.js ./work-runs 8788 127.0.0.1
```

Studio is localhost-bound by default. Container deployments explicitly opt the process into the container interface while the host port remains loopback-bound. Do not expose port 8788 directly to the public Internet; use an authenticated TLS edge.

### MCP

```bash
npm run mcp-server
```

Configure `WORKPROOF_MCP_CONTROL_PLANE_URL` and, when required, `WORKPROOF_MCP_TOKEN`. Mutation tools require explicit idempotency keys.

## Safety and product boundary

A capability receipt is not independent proof. Persisted effects are re-read and verified. Ambiguous external effects cannot be blindly retried, old workers cannot cross fenced execution boundaries, and unauthenticated mutation cannot bypass authoritative policy.

WorkProof Runtime is not a replacement for agents, browsers, workflow engines, memory systems, observability backends, or OSINT graphs. Those systems can integrate as capabilities or adapters while Work Object, outcome contract, effect, verification, recovery, and proof semantics remain invariant.

## Historical release provenance

v3.8.4 was the preceding verified stable distribution. v3.8.2 is retained as superseded history and is not a rollback target. v3.8.1 remains the verified rollback release.

See `STATUS.md`, `SOURCE-MANIFEST.md`, `docs/release-lineage.json`, and `docs/PRODUCT-READINESS-V1.md` for the current verification and product-readiness records.
