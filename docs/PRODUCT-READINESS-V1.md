# Product Readiness V1 — Local-First Digital Work Operator

Date: 2026-09-22

## Purpose

This document converts the verified v3.4 kernel/benchmark into an explicit product-readiness gate. It is an acceptance contract, not a claim that every gate is already complete.

The product target is a **local-first Digital Work Operator** built on WorkProof Runtime. The kernel remains the invariant substrate; product surfaces must not weaken outcome contracts, independent verification, reconciliation, recovery, proof, or risk controls.

## Product promise

A user gives the operator a bounded digital outcome. The system turns that outcome into durable work, executes through explicit capabilities, observes and reconciles side effects, independently verifies the requested outcome, recovers or substitutes when safe, and delivers a portable proof/evidence bundle.

The default deployment is local/self-hosted. Remote infrastructure is an optional deployment target, not a runtime dependency of the core product.

## Product surfaces

### P0 — Required

- Local CLI for mission execution, proof inspection, verification, signer/trust operations, and vault lifecycle.
- Local Studio for work state, execution, workers, leases, proof/audit, and bounded control.
- Local persistent work/proof storage.
- Deterministic capability/pack manifests.
- Reproducible source and container distributions.
- Health/readiness behavior suitable for local supervision.
- Exportable mission artifacts and evidence.

### P1 — Production-ready extension points

- REST/control API with authenticated mutation and idempotency semantics.
- Worker runtime with persistent ownership/recovery and fencing.
- Pack registry with compatibility metadata.
- SDK surface around Work Objects and capability contracts.
- CI verification integration.

### P2 — Interoperability adapters

- MCP adapter: expose approved capabilities without replacing WorkProof semantics. **Implemented:** v3.6 adds the official MCP v2 stdio adapter, authenticated Control Plane forwarding, explicit mutation idempotency, protocol acceptance tests, and packed-package verification.
- A2A adapter: connect external agents as planners/requesters while WorkProof remains the execution/proof boundary. **Implemented in v3.7 candidate:** Agent Card, JSON-RPC task lifecycle, authentication, idempotency, task listing/filtering/paging, and Control Plane forwarding.
- OpenTelemetry adapter: correlate external telemetry with work/evidence without making telemetry authoritative. **Implemented in v3.7 candidate:** dependency-free OTLP/HTTP JSON audit export with field allowlisting and non-fatal exporter failures.

## Local-first contract

1. Core execution must work without a public hostname, DNS, TLS certificate, cloud database, SaaS control plane, or third-party hosted UI.
2. Persistent state must have an explicit local filesystem/storage location.
3. The local deployment must bind administrative surfaces to localhost by default.
4. External side effects must remain explicit capabilities and must pass risk/policy controls.
5. Proof must remain portable and independently verifiable outside the running Studio.
6. A lost worker/process must not silently convert an incomplete operation into success.
7. Remote deployment must be an alternate topology over the same contracts, not a separate semantic implementation.

## External-production readiness contract

The project is considered ready for an external production topology only when the deployment evidence proves, rather than assumes:

- TLS termination and certificate lifecycle.
- Authentication and authorization configuration.
- Secret injection without source/artifact leakage.
- Persistent storage and backup/restore procedure.
- Health and readiness checks.
- Resource limits and restart behavior.
- Log/audit collection appropriate to the deployment.
- Rollback to a previously verified immutable release.
- Upgrade compatibility and migration behavior where state schemas change.
- Network exposure is deny-by-default except for explicitly required endpoints.
- The same proof, verification, reconciliation, and recovery semantics remain intact.

## Release gates

A product release must not be called production-ready solely because CI is green. The following evidence classes are required:

| Gate | Required evidence |
| --- | --- |
| Build | Strict TypeScript build succeeds from a clean checkout |
| Tests | Full unit/integration suite succeeds |
| Benchmark | All required missions succeed with false-done and duplicate-effect metrics within target |
| Failure recovery | Induced ambiguity, worker loss, lease contention, and substitution scenarios are independently verified |
| Security | Dependency audit, secret scan policy, least-privilege checks, and negative authorization tests |
| Distribution | Source/package/container artifacts are reproducible or integrity-pinned and independently rechecked |
| Local install | Fresh local deployment reaches healthy state and executes a representative mission |
| Persistence | Restart/restore preserves required authoritative state and proof semantics |
| External topology | Separate environment proves TLS/auth/secrets/backup/rollback before any public launch |
| Documentation | User, operator, security, compatibility, and release notes match the shipped behavior |

## Current verified baseline — 2026-09-22

The repository now records the coherent published `v3.7.0-dev.1` distribution path. Release workflow #171 and Container workflow #168 verified the release and container artifacts, including published digest lineage, restart/persistence, disposable TLS/auth topology, backup/restore, rollback, and anonymous GHCR pull.

Public host/DNS/TLS/auth/secrets provisioning remains an external deployment-resource boundary; the repository does not claim those external resources are provisioned.

## Next implementation gates

The next work prioritizes executable product value over additional abstract architecture.

Completed:

1. Fresh-checkout package install and operator smoke.
2. Stable product-facing mission format and runnable example mission.
3. Persistent restart/recovery acceptance test.
4. Security negative-path coverage for authenticated control and capability policy.
5. Operator UX for failure, ambiguity, recovery, and proof.
6. Operational overview and attention summary.
7. Package distribution of operator docs and representative mission examples.

Remaining:

8. Broader ecosystem expansion remains a future product phase rather than an unfinished v3.7 release gate.
9. Future A2A streaming/push/multi-turn support and richer telemetry signals remain optional follow-on capabilities.

## Stop conditions

Do not claim completion if any of these are true:

- a capability receipt is being treated as proof;
- ambiguous external effects can be retried blindly;
- an older worker can cross a fenced execution boundary;
- unauthenticated mutation can change authoritative state;
- local restart loses authoritative work/proof state;
- published artifacts cannot be independently verified;
- the UI claims an outcome that the independent verifier did not establish.

## Product boundary

WorkProof Runtime is not required to become a generic agent framework, browser automation product, workflow engine, memory database, observability backend, or OSINT graph. Those systems may integrate as capabilities/adapters. The durable Work Object, outcome contract, effect, verification, recovery, and proof semantics remain the product's invariant boundary.

## Implemented local-first product baseline

The following gates are executable and CI-verified on the current v3.6.0-dev.1 lineage and its published distribution:

- [x] Runtime version is sourced from package metadata instead of stale hard-coded product versions.
- [x] Studio process startup honors control-plane, proof-vault, and trust-policy configuration from arguments/environment.
- [x] Fresh local Studio smoke checks health, UI, filtering, and persisted Work Object visibility.
- [x] Studio restart smoke confirms authoritative local Work Object state survives process restart.
- [x] CLI exposes a packaged `workctl` entrypoint.
- [x] CLI provides a guarded `resume <work-id> <mission.json>` path for persisted work.
- [x] End-to-end resume smoke re-verifies a persisted research outcome after simulated interruption.
- [x] Persisted idempotency keys reject changed operation or input before any retry.
- [x] Portable proof export, independent bundle verification, and import/materialization workflow.
- [x] Explicit versioned proof compatibility policy with strict unsupported-version handling.
- [x] Source-tree verification includes the product readiness specification and product smoke suite.
- [x] CI validates the above together with secret scanning, external topology, retention, benchmark, demo, CLI, multi-capability, and live GitHub gates.


## Current product state

The local-first P0 foundations are complete and executable:

- [x] package install and representative mission smoke
- [x] persistent restart/resume acceptance
- [x] idempotency operation/input drift protection
- [x] portable proof export/verify/import
- [x] versioned proof compatibility
- [x] operator guidance for failure, ambiguity, recovery, and verification states
- [x] operational overview and attention summary
- [x] production Compose restart/persistence smoke
- [x] package distribution includes operator docs and representative mission examples
- [x] MCP v2 stdio interoperability adapter with explicit mutation idempotency
- [x] official MCP client protocol acceptance and packed-package smoke
- [x] A2A 1.0 JSON-RPC interoperability adapter with authenticated Control Plane forwarding
- [x] A2A Agent Card, task lifecycle, ListTasks filtering/paging, and mutation idempotency
- [x] OTLP/HTTP JSON audit export with bounded field allowlist
- [x] expanded Studio operational timeline
- [x] packed A2A artifact smoke and representative A2A-ready mission

The required local-first and external-topology acceptance gates for v3.7.0-dev.1 are complete. Future expansion may add wider mission composition and interoperability features without changing WorkProof authority semantics.


## v3.6.0-dev.1 release state

The current shipped prerelease is `v3.6.0-dev.1`. Release verification run #161 and Container verification run #158 both completed their required gates, including the disposable external-topology validation and published digest lineage.


## v3.6.0-dev.1 control-plane product surface

The dev.12 product surface adds a runnable authenticated control-plane process and SDK dispatch support for executable Work Steps. The control-plane persists Work Objects, mission definitions, proof bundles, audit records, and its durable idempotency ledger. Non-loopback binding is refused unless an explicit auth policy is configured.

The packaged end-to-end acceptance test covers health, dispatch, execution, persistence, proof generation, Work Object retrieval, and idempotent replay. These control-plane capabilities remain subject to the same risk ceilings, independent verification, reconciliation, recovery, and proof rules as the kernel.


## v3.6.0-dev.1 product delta

Completed and verified on the current release lineage:

- Authenticated capability inventory at `GET /v1/capabilities`.
- Runtime/API identity returned from control-plane health.
- SDK capability discovery.
- Studio capability-registry visualization.
- Packed control-plane artifact smoke.
- Package-root runtime version resolution.
- Authorization negative-path coverage for capability discovery.
- Hardened Chromium/CDP startup preflight.

These are additive product surfaces; they do not replace the Work Contract, risk/policy, effect, verification, reconciliation, recovery, or proof invariants.


## v3.6 MCP adapter readiness

The MCP interoperability layer is executable, authenticated through the WorkProof Control Plane, and independently tested through the official MCP TypeScript SDK v2. It exposes capability discovery plus Work Object read/dispatch/resume/cancel tools without creating a parallel execution authority.

Mutation tools require explicit idempotency keys. Capability metadata never grants execution permission. The Control Plane remains authoritative for authentication, authorization, risk ceilings, execution, effect tracking, independent verification, reconciliation, recovery, and proof.

The adapter is distributed through the same source/package/container release path as the runtime and has a packed-package acceptance test from an installed artifact.


## v3.7.0-dev.1 release state

The v3.7.0-dev.1 product surface is published and verified. It includes A2A interoperability, allowlisted OTLP/HTTP JSON audit export, Work Object list/paging, expanded Studio operational timeline, packed A2A verification, and the representative A2A-ready mission.

Release artifacts and the GHCR container are integrity-verified and tied to release commit `f776ed9f5fcbb055f7da41ca69714c19b20f9aad`.