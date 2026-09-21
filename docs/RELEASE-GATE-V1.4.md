# Release Gate v1.4-dev - Distributed Work Foundation

Date: 2026-09-21

## Scope

Introduce explicit worker ownership primitives before adding a remote control plane.

## Acceptance gates

- [x] Lease acquisition grants one owner for a resource at a time in the authority.
- [x] A second owner receives a deterministic busy result while a live lease exists.
- [x] The same owner renews the existing lease instead of creating duplicate ownership.
- [x] Expiry makes a resource acquirable by a new owner.
- [x] Renew and release require exact lease identity and owner identity.
- [x] Expired leases can be reaped deterministically.
- [x] Worker registration deduplicates capability declarations.
- [x] Worker heartbeat and offline state are explicit.
- [x] Ownership assertions reject expired and foreign leases.
- [ ] Cross-process/persistent lease authority.
- [ ] Durable execution leases integrated with WorkEngine.
- [ ] Authenticated control-plane dispatch.
- [ ] Worker-loss reconciliation.
- [ ] Saga/compensation semantics.
- [ ] SDK and remote proof retrieval.

## Safety boundary

The v1.4 initial lease primitive is an in-memory authority. It establishes ownership semantics and deterministic state transitions, but it is not yet a distributed consensus or persistent lock service.

## Milestone result

The first v1.4 foundation gate is complete: feature CI and merged-main CI passed. Distributed worker correctness still requires later cross-process integration gates.
