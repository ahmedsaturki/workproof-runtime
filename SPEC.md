# WorkProof Runtime Specification - v3.8.9

## Current v3.8.9 baseline

The current stable product specification is maintained at v3.8.9. The v3.4 sections below remain historical acceptance records and are not the current release status.

Current verified product surfaces include the local WorkProof Studio, `workctl` CLI, durable Work Objects with restart/resume, portable proof export/verify/import, authenticated Control Plane with idempotency safety, capability inventory/registry, MCP v2, A2A 1.0, OTLP/HTTP JSON audit export, operator diagnostics, persistent local storage, reproducible source/container distributions, immutable container-base provenance, and bounded production resource/log controls.

Current release evidence is recorded in `STATUS.md`, `SOURCE-MANIFEST.md`, `docs/release-lineage.json`, and `docs/PRODUCT-READINESS-V1.md`.

## 1. Purpose

Represent a bounded digital outcome as durable work, execute it through explicit capabilities and worker ownership, safely handle external effects, independently verify outcomes, preserve portable proof, manage proof lifecycle, recover persisted execution after worker loss, and expose a user-facing Studio with authenticated control delegation, proof/audit views, worker visibility, diagnostic lease visibility, bounded operational filtering, and bounded operational health projections.

## 2. Core loop

GOAL -> CONTRACT -> ROUTE -> ACT -> OBSERVE -> VERIFY -> RECONCILE/RECOVER -> DELIVER -> PROVE -> RETAIN -> CONTROL -> COMPENSATE

## 3. Work Contract

A Work Contract contains objective, inputs, constraints, success criteria, deliverables, risk class, and optional approval requirement. Step risk cannot exceed the contract risk ceiling.

## 4. Capability, Effect, Worker, Lease, Saga, Database, and Transformation Contracts

Capabilities declare stable names, versions, supported operations, risk classes, and executable behavior.

Effects track identity, idempotency, operation, capability, risk, attempts, receipts/observed state, and lifecycle timestamps.

Workers expose bounded liveness and reassignment status. Execution/recovery leases establish explicit ownership. Saga recovery records durable compensation lineage.

The SQLite pack provides bounded local query and parameterized local upsert capabilities with independent persisted-state verification.

The data transformation pack provides:
- `pack.transform.json` as a local_write capability for deterministic transformation of an input JSON array of objects.
- declarative filter by primitive equality.
- explicit top-level field projection.
- stable sort by explicit field and direction.
- output limit capped at 500.
- input size/depth/item bounds.
- safe field names only.
- no user-provided code, expressions, SQL, or templates.
- independent persisted-output verification.

## 5. Verification and Evidence

Verification is criterion-specific and evidence-bearing. A receipt is not independent proof.

Proof bundles identify durable work, effects, artifacts, verification, and events. Canonical SHA-256 provides tamper-evident integrity. Ed25519 signatures provide cryptographic authenticity under a trusted key policy.

## 6. Persistence and Retention

Authoritative persistence is used where correctness depends on durable state. The proof vault is content-addressed and retention/GC remains reachability-aware.

## 7. Control Plane and Studio

Authenticated control-plane mutation remains the authorization boundary. Studio is a presentation/delegation layer with read-only operational projections and bounded filtering.

## 8. CLI Lifecycle Surface

The CLI exposes work execution, proof inspection/verification, signer identity, trust/registry operations, vault lifecycle, Studio launch, and registered capability packs including SQLite and data transformation.

## 9. Non-goals

WorkProof is not itself a generic agent framework, browser automation engine, workflow/queue product, memory database, observability backend, OSINT graph, or distributed-consensus system.

## 10. v3.0/v3.1 Baseline

Operational health, local SQLite query/upsert, independent verification, proof integrity, and existing worker/control/retention boundaries remain passing.

## 11. v3.2 Acceptance Target

- v3.1 behavior remains passing.
- JSON transformation is declarative and deterministic.
- filter/projection/sort/limit semantics are explicitly bounded.
- input size, depth, item-count, and selected-field counts are bounded.
- arbitrary user code/expression execution is impossible through the pack contract.
- output is a persisted local artifact.
- independent verifier re-reads the artifact and validates the expected deterministic result.
- evidence references are emitted.
- pack manifest and fixture align with implementation.
- CLI registers the pack.
- source audit, dependency audit, retention, full suite, benchmark, demo, CLI verification, live GitHub smoke
- green feature CI and green merged-main CI


## 12. v3.4 Executable Operator Benchmark

The v3.4 acceptance target turns the benchmark into executable end-to-end work with induced failure modes.

- M001 research-to-artifact remains executable.
- M002 HTTP discovery remains executable.
- M003 Git change executes bounded inspect, mutate, test, commit, push, and independent remote-state verification against a controlled local bare remote.
- M004 ambiguous external effect loses acknowledgement after the server has accepted the write; reconciliation must discover the effect and prevent a duplicate write.
- M005 repeated primary ambiguity must trigger compatible capability substitution followed by independent verification.
- The benchmark reports verified completion, false-done, duplicate-effect, ambiguity resolution, substitution, evidence completeness, and human intervention metrics.
- The benchmark fails closed when required verification is not satisfied.
- Feature CI and merged-main CI must be green.
