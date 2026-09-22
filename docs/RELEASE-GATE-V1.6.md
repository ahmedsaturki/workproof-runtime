# Release Gate v1.6-dev - Worker-Loss Recovery

Date: 2026-09-21

## Scope

Recover persisted Work Objects after worker/process loss without weakening lease ownership, effect idempotency, reconciliation, independent verification, or proof semantics.

## Acceptance gates

- [x] Discover recoverable persisted Work Objects.
- [x] Reload a persisted Work Object into a fresh WorkStore.
- [x] Reap expired ownership before replacement-worker execution.
- [x] Keep live ownership authoritative and return waiting_lease without capability execution.
- [x] Reconcile an ambiguous external effect before blind replay.
- [x] Prevent stale owners from renewing or releasing after ownership moves.
- [x] Feature CI passes source audit, dependency audit, retention, full suite, benchmark, demo, CLI, mission, and live smoke.
- [x] Merged-main CI passes the same verification pipeline on the merge commit.

## Deferred platform gates

- [ ] Authenticated control-plane dispatch/status/cancel/resume.
- [ ] SDK round-trip preservation of Work Object and proof semantics.
- [ ] Explicit saga/compensation primitives.

## Safety boundary

Lease recovery is ownership recovery, not an exactly-once guarantee. External systems still require idempotency and independent reconciliation.

## Milestone result

**v1.6 worker-loss recovery is verified on main.** Main commit: b7a1bacd0d47baab7d759bb572351434ac5fdb60. Merged-main CI: #422 success.
