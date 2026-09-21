# WorkProof Runtime

Outcome-first digital work runtime: execute real work, reconcile external effects, verify outcomes, preserve proof, and manage proof lifecycle.

## Current status

**v1.3 is verified on main.**

The current main line combines durable proof objects, signed proof identity, explicit trusted signer policy, authenticated registry transport, signed trust snapshots, and a self-hosted proof-vault lifecycle with conservative retention and garbage collection.

## Core loop

Goal -> Outcome Contract -> Capability -> Execute -> Observe/Reconcile -> Verify -> Recover/Substitute -> Deliver -> Proof -> Retain

## Verified v1.3 scope

- Content inventory for proof and artifact objects.
- Deterministic retention classes and explicit retention overrides.
- Protected pins and proof-to-artifact reachability.
- Dry-run and journaled garbage collection.
- Integrity-gated deletion with conservative namespace boundaries.
- Orphan detection and repair.
- Lifecycle audit events.
- User-facing vault inventory, retention, pin, unpin, GC, and repair commands.
- CI browser acceptance reliability with explicit CDP preflight and configurable browser binary.
- Full merged-main verification after the browser reliability correction.

## Verification evidence

- 93 required source paths audited.
- Dependency audit passed.
- Retention suite: 9/9.
- Full test-file suite: 23/23.
- Benchmark V2 passed.
- Demo verified.
- CLI proof verification and mission execution verified.
- Live GitHub smoke verified.
- Merged-main CI run #358 passed on commit `6c01f201f6cec32ab6fa34a01fe878d3f47c5b0b`.

## Safety boundary

Garbage collection never treats age alone as sufficient evidence for deletion. Protected roots, explicit retention, reachability, namespace scope, and content integrity are evaluated before deletion.

A capability receipt is not proof of the final outcome. External side effects require independent verification or reconciliation.

SHA-256 integrity is tamper-evident metadata, not a cryptographic signature.

Ed25519 signatures provide cryptographic authenticity under the embedded public key; trusted-key acceptance, revocation, and distribution remain separate policy concerns.

## Product boundary

WorkProof Runtime is not itself a generic agent framework, browser automation engine, workflow/queue product, memory database, observability backend, OSINT graph, or hosted identity provider. Those systems can be integrated as adapters while the Work Object, effect, verification, recovery, and proof semantics remain invariant.

This repository does not make a global novelty claim.
