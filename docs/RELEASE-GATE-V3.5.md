# Release Gate v3.5 — v3.5.0-dev.1

Date: 2026-09-22

## Scope

This prerelease promotes the verified control-plane observability product surface from main into a distributable v3.5 line.

## Required acceptance

- [x] Existing v3.4 benchmark and failure-recovery foundations remain in the baseline
- [x] Control-plane runtime version is explicit in /health
- [x] Capability inventory is authenticated and deterministic
- [x] SDK exposes capability inventory
- [x] Studio exposes the connected capability registry
- [x] Installed-package control-plane startup resolves version from package root
- [x] Packed control-plane smoke executes the real package artifact outside the source checkout
- [x] Negative authorization test covers capability discovery
- [x] Chromium/CDP preflight tolerates slow runner startup
- [x] Mainline CI and release/container gates for v3.5.0-dev.1
- [x] Published release digest and rollback lineage
- [x] Production Compose pin and deployment documentation reconciliation

## Stop conditions

Do not call v3.5.0-dev.1 verified if capability discovery bypasses authorization, the packed artifact reports the wrong runtime version, or the release/container artifact lineage cannot be independently rechecked.

## Product boundary

This release improves operator/developer visibility. It does not expand the WorkProof authority model or make capability metadata an authorization mechanism.


## Published evidence

- GitHub Release: `v3.5.0-dev.1` (ID 393498803)
- Release target commit: `cb48780451ed2eddf9211bc5f267b026e2243ca1`
- Release verification workflow: #144 — success
- Container verification workflow: #141 — success
- GHCR digest: `sha256:ab5b90eb3722b96d714f105536f5c4d6cdc18cebe22992c4fe758fbc88f547d7`
- Immutable GHCR tag: `cb48780451ed2eddf9211bc5f267b026e2243ca1`
- Rollback release: `v3.4.0-dev.12`
- Rollback digest: `sha256:491261f71ff3b010bb7a967b74b348ca40042d3150e2f6c8a36c1a4dcf7012bb`
- Published assets: 5/5 uploaded and post-publication SHA256 verification succeeded.
- Container publication verified health, Compose restart/persistence, external TLS/auth topology, anonymous pull, and OCI provenance.
