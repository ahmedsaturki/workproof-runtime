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
- [ ] Durable worker-loss recovery across persisted Work Objects.
- [ ] Authenticated control-plane dispatch.
- [ ] Cross-process WorkEngine failover with actual durable Work Object reload.
- [ ] SDK round-trip preserves execution ownership and proof semantics.
- [ ] Explicit saga/compensation primitives.

## Safety boundary

An execution lease prevents overlapping ownership within the configured authority. It is not proof of outcome, not an exactly-once guarantee for arbitrary external systems, and not a distributed consensus protocol.

## Milestone result

The v1.5 execution-lease milestone is complete only after feature CI and merged-main CI pass on the same head with the complete verification pipeline green.
