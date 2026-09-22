# Operator Doctor

`workctl doctor` is a local-first diagnostic command for checking whether a WorkProof installation is ready for operator use.

## What it checks

- Runtime package version.
- Local work directory state.
- Packaged CLI entrypoint.
- Packaged Control Plane entrypoint.
- Packaged Studio entrypoint.
- Packaged A2A entrypoint.
- Control Plane liveness at `/health`.
- Control Plane readiness at `/ready`.
- Studio operational overview when configured.
- A2A Agent Card when configured.

## Configuration

The doctor reads:

- `WORKPROOF_WORK_DIRECTORY`
- `WORKPROOF_CONTROL_PLANE_URL`
- `WORKPROOF_STUDIO_URL`
- `WORKPROOF_STUDIO_TOKEN`
- `WORKPROOF_A2A_URL`

Unconfigured remote services are reported as `skipped`; a configured but unreachable service is a failure.

## Exit semantics

- `0`: no failed checks. A missing work directory may produce `degraded` because a fresh install may not have created state yet.
- `1`: at least one configured/required check failed.

The command emits a machine-readable JSON report suitable for supervision and CI wrappers:

```bash
workctl doctor
```

The doctor is observational. It never executes work, changes Work Objects, marks outcomes verified, or mutates external systems.

## Readiness endpoint

The authenticated Control Plane exposes:

```
GET /ready
```

The endpoint is intentionally unauthenticated so local supervisors can determine whether the process is ready to accept authenticated operations. It validates the repository listing interface and idempotency storage parent when configured.
