# Control Plane API V1

WorkProof Runtime exposes a local-first HTTP control plane for authenticated operational control.

## Transport

- HTTP or HTTPS.
- Loopback is the default bind.
- Non-loopback application startup requires an explicit authentication policy.
- Mutating requests use the durable `Idempotency-Key` header when the idempotency ledger is enabled.
- JSON responses include a request identifier for correlation.

## Health

`GET /health`

Returns runtime and API protocol identity without requiring authentication:

```json
{
  "status": "ok",
  "version": "3.5.0-dev.1",
  "apiVersion": "1.0",
  "requestId": "..."
}
```

## Capability inventory

`GET /v1/capabilities`

Requires the configured `read` permission. Returns the capabilities registered by the running runtime, including version, supported operations, and risk classification. The list is sorted deterministically by capability name and operations.

The inventory is descriptive metadata; it does not authorize an operation by itself. Actual execution still passes through WorkProof risk ceilings, policy, idempotency, effect tracking, independent verification, reconciliation, recovery, and proof.

## Work

`GET /v1/work/:id`

Reads the persisted Work Object.

`POST /v1/work/dispatch`

Creates and executes bounded work from the supplied Work Contract/steps. When the durable idempotency ledger is configured, a valid `Idempotency-Key` is required.

`POST /v1/work/:id/resume`

Resumes a persisted Work Object using its stored mission definition. When the durable idempotency ledger is configured, a valid `Idempotency-Key` is required.

`POST /v1/work/:id/cancel`

Cancels non-terminal work. Replays the completed idempotent result instead of duplicating the mutation.

## Workers and leases

`GET /v1/workers`

Returns sanitized worker liveness/status data when a worker-status source is configured.

`GET /v1/leases`

Returns sanitized execution lease data when a lease-status source is configured.

## Response and safety semantics

The control plane does not treat a capability receipt as proof. The runtime persists Work Objects, effects, events, and proof artifacts, and the verifier independently establishes requested outcomes.

An idempotency key is bound to the operation and a canonical request fingerprint. Reusing a key with a different operation or input is rejected as a conflict. A request already in progress is rejected rather than executed concurrently through the same key.

The capability inventory is intended for Studio, SDKs, operators, and future adapters. It is a read-only discovery surface and is not a replacement for policy authorization.
