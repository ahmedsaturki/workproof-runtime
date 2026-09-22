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

- Feature CI verifies TypeScript build, source-tree completeness, packed CLI smoke, doctor smoke, and the full unit/integration suite.
- Control Plane `/ready` is tested from the packaged application.
- `workctl doctor` healthy/failure paths are tested.
- Module import safety is tested without starting a server or creating runtime state.

Release publication, GHCR digest capture, and production Compose pinning are verified. Main promotion is the remaining integration gate.


## Feature evidence

- Feature CI #1232: success
- Candidate commit: `9825fccc952103714405b0c891e9970f474f89ad`
- Build, packed CLI, Operator Doctor, retention, full unit/integration suite, benchmark, demo, CLI proof, representative missions, and live GitHub smoke all passed on the feature line.
- The release branch is re-running `npm run check` from the exact publication commit before artifacts are created.


## Published evidence

- Feature CI #1234: success
- Release workflow #180: success
- Container workflow #177: success
- GitHub Release: `v3.8.0-dev.1` / ID `393551082`
- Release commit: `bba39f385ab042344f4fc2ebe04aeef7ef3c98b9`
- GHCR digest: `sha256:acafde09bd74d535fb706acde68f7e6279283ac49f6d1863585d672fb691ac02`
- Immutable image tag: `bba39f385ab042344f4fc2ebe04aeef7ef3c98b9`
- Five release assets published and verified
- Container runtime, Compose persistence, external topology, anonymous pull, and digest/provenance verification: success
- Rollback lineage: `v3.7.0-dev.1` / `sha256:28e8d9af0ab71442b33df8b72308089f520b5ba23128401c0a05675809ba1748`

## Main promotion
- [ ] post-merge main CI


## Final closeout evidence

- Feature CI #1234: success.
- Release workflow #180: success.
- Container workflow #177: success.
- GitHub Release `v3.8.0-dev.1` / ID `393551082`: published and verified.
- Release commit: `bba39f385ab042344f4fc2ebe04aeef7ef3c98b9`.
- GHCR digest: `sha256:acafde09bd74d535fb706acde68f7e6279283ac49f6d1863585d672fb691ac02`.
- Production Compose pinned to the published digest.
- Main merge commit: `0e7e8050a98a4c4863fe81f49a69ab4bc8a646b8`.
- Main CI #1236: success.
