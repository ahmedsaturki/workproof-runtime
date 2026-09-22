# Release Gate v3.4 — Current

Date: 2026-09-22

Current target: `v3.4.0-dev.9`.

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

- [x] GitHub Release v3.4.0-dev.9 published (ID 393389908)
- [x] 5 release assets re-downloaded and SHA256-verified
- [x] published benchmark semantics re-verified
- [x] GHCR image published
- [x] OCI version/revision verified
- [x] runtime health and anonymous pull verified
- [x] version tag and immutable commit tag resolve to the same digest

Public DNS/TLS/auth/secrets remain a separate external-infrastructure gate.


## Dev.9 published evidence

Release ID: `393389908`
Release target: `3041aeb49241dc50daae56ba70763bc61aeb29bf`
GHCR digest: `sha256:3acde2ee0e82c0d7bf1e9bd8217aa774e1ceb5cdafd64150b87b7581aa0ea04d`
Container verification included production Compose restart/persistence smoke.
