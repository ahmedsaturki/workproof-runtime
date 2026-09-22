# OpenTelemetry Export

WorkProof Runtime can export control-plane audit events as OTLP/HTTP JSON logs without making OpenTelemetry authoritative to execution or proof.

## Configuration

- `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`: explicit logs endpoint.
- `OTEL_EXPORTER_OTLP_ENDPOINT`: base OTLP endpoint; `/v1/logs` is appended for the logs signal.
- `OTEL_EXPORTER_OTLP_LOGS_HEADERS`: comma-separated headers.
- `OTEL_EXPORTER_OTLP_HEADERS`: fallback shared headers.

Only a bounded allowlist of control-plane audit fields is exported. Arbitrary request fields are not sent, reducing accidental propagation of secrets or unrelated payload data.

Failures are non-fatal to WorkProof execution: the exporter returns false and the control plane continues serving work.

## Semantics

The exporter emits OTLP/HTTP JSON `resourceLogs` with service identity and a `workproof.control.audit` event name. The telemetry stream is observational only; it cannot mark a Work Object verified and is never used as a proof source.

## Example

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4318 npm run control-plane
```

For public deployments, use an authenticated collector endpoint and keep the collector credentials outside source control.
