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
- [x] benchmark
- [x] demo
- [x] CLI proof
- [x] representative missions
- [x] live GitHub integration smoke
- [x] release artifact publication
- [x] GHCR image publication
- [x] production Compose digest pin
- [x] post-merge main CI

## Stop conditions

Do not call v3.8 verified if:
- doctor mutates authoritative Work state;
- readiness reports ready while the repository or configured idempotency storage is unavailable;
- CLI module import starts a server;
- packaged doctor paths resolve incorrectly;
- a failed configured service is silently treated as healthy.


## Feature verification

- Feature CI verifies TypeScript build, source-tree completeness, packed CLI smoke, and full unit/integration suite.
- Control Plane `/ready` is tested from the packaged application.
- `workctl doctor` healthy/failure paths are tested.
- Module import safety is tested without starting a server or creating runtime state.

Release publication and main promotion remain separate gates until the exact v3.8 release artifact is generated.
