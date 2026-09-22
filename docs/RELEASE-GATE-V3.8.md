# Release Gate v3.8 — v3.8.0-dev.1

Date: 2026-09-22

## Scope

Add a local-first operational diagnostics surface without changing WorkProof authority semantics.

## Required acceptance

- [x] Control Plane `/ready` endpoint
- [x] safe Control Plane module imports without startup side effects
- [x] `workctl doctor`
- [x] doctor JSON contract
- [x] doctor healthy service probes
- [x] doctor failure reporting
- [x] source-tree gate coverage
- [x] full unit/integration suite
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


## Feature verification

- Feature CI verifies TypeScript build, source-tree completeness, packed CLI smoke, doctor smoke, and the full unit/integration suite.
- Control Plane `/ready` is tested from the packaged application.
- `workctl doctor` healthy/failure paths are tested.
- Module import safety is tested without starting a server or creating runtime state.

Release publication, GHCR digest capture, production Compose pinning, and main promotion remain open until the exact v3.8 release artifact is generated and reverified.
