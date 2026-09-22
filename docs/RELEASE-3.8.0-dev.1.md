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


## Published verification

- GitHub Release ID: `393551082`
- Release target: `bba39f385ab042344f4fc2ebe04aeef7ef3c98b9`
- Release workflow #180: success
- Container workflow #177: success
- GHCR digest: `sha256:acafde09bd74d535fb706acde68f7e6279283ac49f6d1863585d672fb691ac02`
- Immutable image tag: `bba39f385ab042344f4fc2ebe04aeef7ef3c98b9`
- Published assets: 5/5
- Post-publication release verification: success
- Runtime health: success
- Compose restart/persistence: success
- External topology TLS/auth/backup/restore/rollback: success
- Anonymous GHCR pull: success

Rollback target: `v3.7.0-dev.1` at `sha256:28e8d9af0ab71442b33df8b72308089f520b5ba23128401c0a05675809ba1748`.
