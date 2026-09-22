# WorkProof Runtime

Outcome-first digital work runtime: execute real work, reconcile external effects, verify outcomes, preserve proof, manage proof lifecycle, recover execution after worker loss, expose authenticated control, and provide a local operational Studio.

## Current status

**v3.8.10 is the release candidate; v3.8.9 is the latest published stable release until this candidate completes.**

v3.8.9 preserves the verified v3.8.8 runtime contract and promotes the current specification and GitHub governance baseline.

The v3.4 line established the executable operator benchmark across research, HTTP discovery, Git mutation, ambiguous external-effect reconciliation, and capability substitution. Later releases added local product surfaces, proof compatibility, recovery, Control Plane safety, MCP/A2A interoperability, OTLP audit export, diagnostics, network-boundary hardening, and reproducible distribution.

## Core loop

Goal -> Outcome Contract -> Capability -> Execute -> Observe/Reconcile -> Verify -> Recover/Substitute -> Deliver -> Proof -> Retain -> Control -> Compensate

## v3.8.10 release candidate

- Package version: `3.8.10`
- Release branch: `release/3.8.10`
- Previous published stable release: `v3.8.9`
- This candidate is built from the fully reconciled `main` tree.
- The release/container workflows are the source of truth for publication, digest, asset, and benchmark verification.
- Production Compose on the candidate branch intentionally remains pinned to the last published stable image until the v3.8.10 container digest is published and reconciled into `main`.

### v3.8.9 closeout hardening

- Dockerfile OCI metadata is emitted as real Dockerfile `LABEL` instructions rather than embedded escaped-newline text.
- Container-base validation rejects literal escaped-newline instruction sequences.
- Main release-state verification requires a version bump for post-release source/distribution drift beyond the explicit reconciliation surface.

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

The v3.8.9 release publishes:

- `operational-reality-core-3.8.9.tgz`
- `workproof-runtime-v3.8.9.tar.gz`
- `workproof-benchmark-v3.8.9.json`
- `RELEASE-MANIFEST.txt`
- `SHA256SUMS.txt`

The release pipeline re-downloads published assets, verifies SHA256 sums, verifies tag/commit lineage, validates benchmark semantics, and verifies the publication state.

### GHCR container

`ghcr.io/ahmedsaturki/workproof-runtime:3.8.9@sha256:ccde8ada2227b016968328f9eec1849e7424d12c2acc89081c30ca191bb6df66`

The immutable commit tag is `54570624e0a3c2c35605cf3e17b7a48c6c5758c6`.

### Self-hosted runtime

The repository includes:

- `Dockerfile`
- `compose.production.yaml`
- `docs/CONTAINER-RUNTIME.md`
- `docs/PRODUCTION-DEPLOYMENT.md`

Production Compose pins the exact verified v3.8.9 image digest, binds the host port to localhost, persists `./work-runs`, and applies bounded resources/logs. The Control Plane is the authenticated mutation boundary.

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

v3.8.9 is the immediately preceding published stable distribution. v3.8.2 is retained as superseded history and is not a rollback target. v3.8.1 remains the verified rollback release.

See `STATUS.md`, `SOURCE-MANIFEST.md`, `docs/release-lineage.json`, and `docs/PRODUCT-READINESS-V1.md` for the current verification and product-readiness records.
