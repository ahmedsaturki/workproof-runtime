# Stable Release Gate — v3.8.0

Date: 2026-09-22

## Purpose

Promote the already verified v3.8.0-dev.1 code path to stable version 3.8.0 and revalidate all release artifacts under the stable version itself.

## Required acceptance

- [x] v3.8.0-dev.1 feature gate
- [x] stable package version is exactly 3.8.0
- [ ] stable full release verification
- [ ] stable GitHub Release publication
- [ ] stable GHCR image publication
- [ ] stable container runtime health
- [ ] stable production Compose restart/persistence
- [ ] stable external TLS/auth/backup/restore/rollback topology
- [ ] stable anonymous GHCR pull
- [ ] stable digest/provenance reconciliation
- [ ] stable main promotion PR
- [ ] stable post-merge main CI
- [ ] final documentation closeout CI

## Stop conditions

Do not call 3.8.0 stable if any release artifact differs from the tested source commit, the container digest is not reconciled, or main post-merge verification fails.

## Existing v3.8.0-dev.1 evidence

- Feature CI #1234: success
- Release #180: success
- Container #177: success
- Main CI #1236/#1241: success
- Dev.1 GHCR rollback baseline: `sha256:acafde09bd74d535fb706acde68f7e6279283ac49f6d1863585d672fb691ac02`
