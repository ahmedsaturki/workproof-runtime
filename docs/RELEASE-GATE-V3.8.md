# Release Gate v3.8 — v3.8.0-dev.1

Date: 2026-09-22

## Scope

Add a local-first operational diagnostics surface without changing WorkProof authority semantics.

## Required acceptance

- [ ] Control Plane `/ready` endpoint
- [ ] safe Control Plane module imports without startup side effects
- [ ] `workctl doctor`
- [ ] doctor JSON contract
- [ ] doctor healthy service probes
- [ ] doctor failure reporting
- [ ] source-tree gate coverage
- [ ] full unit/integration suite
- [ ] benchmark
- [ ] demo
- [ ] CLI proof
- [ ] representative missions
- [ ] live GitHub integration smoke
- [ ] release artifact publication
- [ ] GHCR image publication
- [ ] production Compose digest pin
- [ ] post-merge main CI

## Stop conditions

Do not call v3.8 verified if:
- doctor mutates authoritative Work state;
- readiness reports ready while the repository or configured idempotency storage is unavailable;
- CLI module import starts a server;
- packaged doctor paths resolve incorrectly;
- a failed configured service is silently treated as healthy.
