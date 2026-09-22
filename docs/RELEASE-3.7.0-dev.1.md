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
