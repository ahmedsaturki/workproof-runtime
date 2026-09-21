# WorkProof Runtime

Outcome-first digital work runtime: execute real work, reconcile external effects, verify outcomes, preserve proof, manage proof lifecycle, and bind execution to worker ownership.

## Current status

**v1.5 WorkEngine execution-lease integration is verified on main.**

The main line now combines durable Work Objects, signed proof identity, trusted signer policy, authenticated proof registry transport, proof-vault lifecycle management, persistent cross-process lease authority, worker registration/heartbeat/offline state, and WorkEngine-bound execution leases.

## Core loop

Goal -> Outcome Contract -> Capability -> Execute -> Observe/Reconcile -> Verify -> Recover/Substitute -> Deliver -> Proof -> Retain

## Verified platform gates

- v1.0 self-hosted proof registry.
- v1.1 authenticated registry.
- v1.2 signed trust-policy synchronization.
- v1.3 retention/reachability/GC lifecycle.
- Browser acceptance reliability correction.
- v1.4 deterministic worker ownership.
- v1.4.1 persistent cross-process lease authority.
- v1.5 WorkEngine execution-lease binding.

## v1.5 execution ownership

- WorkEngine acquires a lease before executing a step.
- Busy ownership becomes an explicit `waiting_lease` work state without invoking the capability.
- Long-running capability execution renews ownership through a heartbeat.
- Ownership loss prevents false verified success and records an unresolved outcome.
- Graceful completion releases the lease.
- Persisted effect semantics remain authoritative; leases do not replace external idempotency or reconciliation.

## Verification evidence

- Main commit: `b09fbf40489944b09dbcb33dda73ba0fcb57fb04`
- Merged-main CI #410: success.
- Source audit: 101/101 required paths.
- Dependency security audit: success.
- Retention lifecycle suite: passed.
- Full sequential unit/integration suite: passed.
- Benchmark: passed.
- Demo: verified.
- CLI proof and mission: verified.
- Live GitHub smoke: verified.

## Safety boundary

Leases prevent overlapping ownership within their configured authority. They are not proof of outcome, an exactly-once guarantee for arbitrary external systems, or a distributed-consensus protocol.

A capability receipt is not proof of the final outcome. External side effects require independent verification or reconciliation.

SHA-256 integrity is tamper-evident metadata, not a cryptographic signature.

Ed25519 signatures provide cryptographic authenticity under the embedded public key; trusted-key acceptance, revocation, rotation, and distribution remain separate policy concerns.

Garbage collection never treats age alone as sufficient evidence for deletion. Protected roots, explicit retention, reachability, namespace scope, and content integrity are evaluated before deletion.

## Product boundary

WorkProof Runtime is not itself a generic agent framework, browser automation engine, workflow/queue product, memory database, observability backend, OSINT graph, or hosted identity provider. Those systems can be integrated as adapters while the Work Object, effect, verification, recovery, and proof semantics remain invariant.

## Next engineering gate

**v1.6 — worker-loss recovery and authenticated control-plane foundation**

The next gate extends ownership from single-step lease binding into recoverable multi-process execution: persisted Work Object reload after worker loss, deterministic lease-expiry reconciliation, authenticated dispatch/status/cancel/resume primitives, SDK round-trip preservation, and explicit saga/compensation semantics.

This repository does not make a global novelty claim.
