# Release Gate v1.5-dev - WorkEngine Execution Leases

Date: 2026-09-21

## Scope

Bind worker ownership to actual WorkEngine execution so multiple workers cannot concurrently execute the same step while preserving effect idempotency, recovery, verification, and proof semantics.

## Acceptance gates

- [x] WorkEngine can acquire an execution lease before a step.
- [x] Busy execution leases produce waiting_lease without invoking the capability.
- [x] Graceful step completion releases the execution lease.
- [x] Long-running capabilities renew the lease through a heartbeat.
- [x] Lease loss during execution prevents false verified success.
- [x] Existing Work Object, effect, recovery, and verification semantics remain intact.
- [x] Feature CI passes source audit, dependency audit, retention, full suite, benchmark, demo, CLI, and live smoke.
- [x] Merged-main CI passes the same verification pipeline on main.

## Post-v1.5 remaining gates

- [ ] Durable worker-loss recovery across persisted Work Objects.
- [ ] Authenticated control-plane dispatch/status/cancel/resume.
- [ ] Cross-process WorkEngine failover with actual durable Work Object reload.
- [ ] SDK round-trip preserves execution ownership and proof semantics.
- [ ] Explicit saga/compensation primitives.

## Safety boundary

An execution lease prevents overlapping ownership within the configured authority. It is not proof of outcome, an exactly-once guarantee for arbitrary external systems, or a distributed consensus protocol.

## Milestone result

**v1.5 execution-lease integration is verified on main.** Main commit: b09fbf40489944b09dbcb33dda73ba0fcb57fb04. Merged-main CI: #410 success.
