# WorkProof Runtime v3.8.0-dev.1

Local-first operator diagnostics prerelease.

## Included

- Explicit Control Plane readiness endpoint.
- Safe Control Plane module import without implicit server startup.
- Packaged `workctl doctor` command.
- JSON diagnostic contract for local runtime, Control Plane, Studio, and A2A.
- Failure-visible supervision behavior.
- New acceptance coverage for readiness and diagnostics.

## Boundary

The doctor and readiness endpoints are observational. Neither can execute work, mutate Work Objects, assert verification, or replace proof.

Publication evidence will be recorded by the release workflow only after the exact v3.8 release commit passes full release verification and container verification.
