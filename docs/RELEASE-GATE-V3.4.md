# Release Gate v3.4 — Current

Date: 2026-09-22

Current target: `v3.4.0-dev.7`.

## Acceptance

- [x] benchmark M001-M005 verified
- [x] build and dependency audit
- [x] source-tree gate
- [x] package install and real mission smoke
- [x] restart/resume and idempotency safety
- [x] portable proof lifecycle
- [x] explicit proof compatibility
- [x] Studio operator guidance
- [x] production Compose restart/persistence smoke
- [x] exact release-commit container build context
- [x] package carries docs/examples

## Distribution

Release CI must re-download and SHA256-verify five assets and re-validate benchmark semantics.

Container CI must verify OCI version/revision, health, anonymous pull, and version/immutable-commit digest equality.

Public host/DNS/TLS/auth/secrets remain an external gate.
