# Stable Release Gate — v3.8.0

Date: 2026-09-22

## Purpose

Promote the already verified v3.8.0-dev.1 code path to stable version 3.8.0 and revalidate all release artifacts under the stable version itself.

## Required acceptance

- [x] v3.8.0-dev.1 feature gate
- [x] stable package version is exactly 3.8.0
- [x] stable full release verification
- [x] stable GitHub Release publication
- [x] stable GHCR image publication
- [x] stable container runtime health
- [x] stable production Compose restart/persistence
- [x] stable external TLS/auth/backup/restore/rollback topology
- [x] stable anonymous GHCR pull
- [x] stable digest/provenance reconciliation
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


## Stable publication evidence

- package version: `3.8.0`
- release tag: `v3.8.0`
- release commit: `2b02d22e897d5fe736f93267c72036d951f74082`
- GitHub Release ID: `393558255`
- Release workflow #189: success
- Container workflow #186: success
- GHCR digest: `sha256:f057384da7a5789aa71ffcec0ea4589ec8c10e7a9e1b37f8cabcabd303d38fcc`
- immutable image tag: `2b02d22e897d5fe736f93267c72036d951f74082`
- rollback: `v3.8.0-dev.1` / `sha256:acafde09bd74d535fb706acde68f7e6279283ac49f6d1863585d672fb691ac02`
