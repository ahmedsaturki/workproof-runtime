# Release Gate v3.4 — Current

Date: 2026-09-22

Current target: `v3.4.0-dev.8`.

## Required acceptance

- [x] M001-M005 benchmark verified
- [x] TypeScript build and dependency audit
- [x] source-tree gate
- [x] package install and real mission smoke
- [x] restart/resume safety
- [x] idempotency operation/input drift protection
- [x] portable proof lifecycle
- [x] proof compatibility
- [x] Studio operator guidance UX
- [x] production Compose restart/persistence smoke
- [x] exact release-commit container build context
- [x] package contains docs and mission examples

## Distribution acceptance

- [ ] GitHub Release v3.4.0-dev.8 published
- [ ] 5 release assets re-downloaded and SHA256-verified
- [ ] published benchmark semantics re-verified
- [ ] GHCR image published
- [ ] OCI version/revision verified
- [ ] runtime health and anonymous pull verified
- [ ] version tag and immutable commit tag resolve to the same digest

Public DNS/TLS/auth/secrets remain a separate external-infrastructure gate.
