# Release Gate v1.4.1-dev - Persistent Cross-Process Ownership

Date: 2026-09-21

## Scope

Persist lease and worker ownership state so multiple local processes can safely coordinate work on a shared host without a network service or external database.

## Acceptance gates

- [x] File-backed lease records survive process/database reopen.
- [x] Lease identity and revision survive reopen.
- [x] Same-owner reacquisition renews the existing persisted lease.
- [x] Expiry is evaluated from durable timestamps.
- [x] Persistent worker registration deduplicates capabilities.
- [x] Worker metadata and heartbeat state survive reopen.
- [x] Two independent Node processes cannot both acquire the same resource.
- [x] Cross-process winner/loser behavior is deterministic at the ownership contract level: exactly one owner is granted and another receives busy.
- [x] No external runtime dependency is required beyond Node.js 24.x built-in SQLite.
- [ ] Durable WorkEngine execution leases.
- [ ] Worker-loss reconciliation.
- [ ] Authenticated control-plane dispatch.
- [ ] Remote proof retrieval/retention integration.
- [ ] Generalized saga/compensation semantics.

## Safety boundary

This is persistent coordination on a shared filesystem using SQLite transaction serialization. It is not a distributed consensus protocol and does not claim correctness across unreliable network partitions or independent machines without a shared durable authority.

## Verification rule

The gate is complete only after feature-branch CI and merged-main CI both pass the complete build, security, source audit, retention, full suite, benchmark, demo, CLI, and live GitHub smoke pipeline.
