# WorkProof Runtime v3.7.0-dev.1

Digital-work interoperability prerelease extending the verified v3.6 MCP line.

## Included

- A2A 1.0 HTTP/JSON-RPC adapter with Agent Card discovery.
- Authenticated SendMessage, GetTask, and CancelTask task boundary.
- Deterministic A2A mutation idempotency derived from message/task identity.
- A2A task/artifact state projection from persisted Work Objects.
- Work Object listing through the Control Plane and SDK.
- Dependency-free OTLP/HTTP JSON export of allowlisted Control Plane audit events.
- Expanded representative mission coverage with an A2A-ready runnable mission.
- Packed A2A artifact smoke and telemetry allowlist tests.

## Authority boundary

A2A is an interoperability interface, not an execution engine. Every mutation is forwarded to the authenticated WorkProof Control Plane. Risk ceilings, authorization, effects, verification, reconciliation, recovery, idempotency, and proof remain authoritative in WorkProof.

OpenTelemetry is observational only. Exported telemetry cannot mark work verified and is never used as proof.

## Scope boundary

This prerelease deliberately does not add streaming A2A messages, push notifications, or multi-turn task-message continuation. Those are later extension points after the bounded request/task lifecycle is proven.

## Distribution

The package remains private to the npm registry. Supported distribution remains source archive, npm-compatible package artifact, GitHub Release, and GHCR container.

## Verification target

The release must pass the complete repository CI, packed A2A/package smoke, benchmark, full unit/integration suite, published lineage verification, container topology verification, release asset integrity verification, and post-merge main verification.


## Published verification

- GitHub Release ID: 393526164
- Release target: `f776ed9f5fcbb055f7da41ca69714c19b20f9aad`
- Release workflow #171: success
- Container workflow #168: success
- GHCR digest: `sha256:28e8d9af0ab71442b33df8b72308089f520b5ba23128401c0a05675809ba1748`
- Immutable image tag: `f776ed9f5fcbb055f7da41ca69714c19b20f9aad`
- Published assets: 5/5
- Post-publication SHA256 verification: success
- Runtime health, Compose persistence, and external topology: success
- Anonymous GHCR pull: success

Rollback target: `v3.6.0-dev.1` at `sha256:2c5ba1b58697ec545cf7098d93e8750394b9b1e2ccd9e8f45b647cec689bd247`.
