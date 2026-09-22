# Release Gate v3.4 — Current

Date: 2026-09-22

Current target: `v3.4.0-dev.12`.

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
- [x] runnable authenticated control-plane process
- [x] SDK dispatch surface with explicit step idempotency/risk ceilings
- [x] packaged control-plane end-to-end smoke
- [x] published release lineage reconciled to the dev.12 tag

## Distribution acceptance

- [x] GitHub Release v3.4.0-dev.12 published (ID 393489868)
- [x] 5 release assets re-downloaded and SHA256-verified
- [x] published benchmark semantics re-verified
- [x] GHCR image published
- [x] OCI version/revision verified
- [x] runtime health and anonymous pull verified
- [x] version tag and immutable commit tag resolve to the same digest
- [x] production compose pinned to the published dev.12 digest
- [x] rollback lineage points to the previous verified dev.11 image

Public DNS/TLS/auth/secrets remain a separate external-infrastructure gate.

## Dev.12 published evidence

Release ID: `393489868`
Release target: `1b174b33da8e519e5a23e7565944aba6266d8e97`
Release workflow run: `124`
Container workflow run: `127`
GHCR digest: `sha256:491261f71ff3b010bb7a967b74b348ca40042d3150e2f6c8a36c1a4dcf7012bb`
Rollback image: `ghcr.io/ahmedsaturki/workproof-runtime:aeaaac3d9224b7eac297ac8f63207bf97b532e4d@sha256:d0c4a8134e0b73d68dc6a0489bbc058b90e633a01171df980aebd1e7b47affff`

The release branch/tag has been published and verified. The closeout commit reconciles repository lineage/configuration with the already-published dev.12 artifacts before promotion back to `main`.
