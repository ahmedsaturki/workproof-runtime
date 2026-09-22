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
- [ ] Mainline CI and release/container gates for v3.5.0-dev.1
- [ ] Published release digest and rollback lineage
- [ ] Production Compose pin and deployment documentation reconciliation

## Stop conditions

Do not call v3.5.0-dev.1 verified if capability discovery bypasses authorization, the packed artifact reports the wrong runtime version, or the release/container artifact lineage cannot be independently rechecked.

## Product boundary

This release improves operator/developer visibility. It does not expand the WorkProof authority model or make capability metadata an authorization mechanism.
