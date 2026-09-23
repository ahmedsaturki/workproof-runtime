# WorkProof Runtime

Outcome-first digital work runtime: execute real work, reconcile external effects, verify outcomes, preserve proof, manage proof lifecycle, recover execution after worker loss, expose authenticated control, and provide a local operational Studio.

## Current status

**v3.8.12 is the current stable release.**

v3.8.12 is the security hardening release following v3.8.11; it carries verified protection for remote-data-to-file boundaries, safe transport serialization, browser Runtime.evaluate escaping, release-lineage API boundaries, external-topology image selection, and repository-hygiene regressions. The published release tag and source snapshot are anchored to release commit `19b1efbfbc5f6f2d14eae5538f339667bd9fbb92`. Release workflow #284 and Container workflow #281 verified the published GitHub/GHCR distribution.

The v3.4 line established the executable operator benchmark across research, HTTP discovery, Git mutation, ambiguous external-effect reconciliation, and capability substitution. Later releases added local product surfaces, proof compatibility, recovery, Control Plane safety, MCP/A2A interoperability, OTLP audit export, diagnostics, network-boundary hardening, and reproducible distribution.

## Core loop

Goal -> Outcome Contract -> Capability -> Execute -> Observe/Reconcile -> Verify -> Recover/Substitute -> Deliver -> Proof -> Retain -> Control -> Compensate

## v3.8.12 release evidence

- GitHub Release: `v3.8.12` (ID `394761988`)
- release commit: `19b1efbfbc5f6f2d14eae5538f339667bd9fbb92`
- Release workflow #284: success
- Container workflow #281: success
- GHCR image: `ghcr.io/ahmedsaturki/workproof-runtime:3.8.12`
- GHCR digest: `sha256:5690c65d0425c743c4fa0ebc1a31f913497eb6b7d4e8fa11a129a833aa926d5d`
- commit-addressed image tag: `19b1efbfbc5f6f2d14eae5538f339667bd9fbb92`
- rollback: v3.8.1 / `sha256:7908cc6a4473495b7b5c51f1a0527815f0a8ff0c6d9eaf20ebf1ddfb0479b5d0`
- five release assets published and SHA256-verified

### v3.8.12 closeout hardening

- stable public error responses for A2A, Studio, and Control Plane while retaining detailed private audit information;
- validated trust-snapshot serialization before local persistence and registry transport;
- browser Runtime.evaluate string escaping for delimiter-sensitive values;
- validated and atomic web-discovery artifact materialization;
- constrained registry proof/trust transport payloads;
- fixed repository/tag endpoints for release-lineage verification;
- constrained release-image selection to the official WorkProof GHCR repository and package version;
- regression coverage for affected trust boundaries, malformed network data, and repository hygiene;
- scoped CodeQL data-flow exclusions limited to the two reviewed artifact sink modules, with the surrounding application flow and regression tests retained in the security corpus.

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

The v3.8.12 release publishes:

- `operational-reality-core-3.8.12.tgz`
- `workproof-runtime-v3.8.12.tar.gz`
- `workproof-benchmark-v3.8.12.json`
- `RELEASE-MANIFEST.txt`
- `SHA256SUMS.txt`

The release pipeline re-downloads published assets, verifies SHA256 sums, verifies tag/commit lineage, validates benchmark semantics, and verifies the publication state. For v3.8.12, the final release verification passed and `sha256sum -c SHA256SUMS.txt` verified the published release assets.

### GHCR container

`ghcr.io/ahmedsaturki/workproof-runtime:3.8.11@sha256:9ad675ba540959c8ada0254f6c133c5fd51eaf02319fe8032b39738f34ea5088`

The commit-addressed image tag is `9568cb2daffdd2f142f6112b1a6bd2c9cdbc4298`.

### Self-hosted runtime

The repository includes:

- `Dockerfile`
- `compose.production.yaml`
- `docs/CONTAINER-RUNTIME.md`
- `docs/PRODUCTION-DEPLOYMENT.md`

Production Compose pins the exact verified v3.8.12 image digest, binds the host port to localhost, persists `./work-runs`, and applies bounded resources/logs. The Control Plane is the authenticated mutation boundary.

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

v3.8.11 is the immediately preceding published stable distribution; v3.8.12 is the current stable release. v3.8.10 and earlier versions remain historical provenance, while v3.8.1 remains the verified rollback release.


See `STATUS.md`, `SOURCE-MANIFEST.md`, `docs/release-lineage.json`, and `docs/PRODUCT-READINESS-V1.md` for the current verification and product-readiness records.
