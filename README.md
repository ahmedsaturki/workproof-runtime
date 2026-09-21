# WorkProof Runtime

Outcome-first digital work runtime: execute real work, reconcile external effects, verify outcomes, preserve proof, manage proof lifecycle, and recover execution after worker loss.

## Current status

**v1.6 worker-loss recovery is verified on main.**

The main line combines durable Work Objects, signed proof identity, trusted signer policy, authenticated proof registry transport, proof-vault lifecycle management, persistent cross-process lease authority, worker registration/heartbeat/offline state, WorkEngine-bound execution leases, and durable recovery after worker loss.

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
- v1.6 worker-loss recovery.

## v1.6 worker-loss recovery

- Recoverable persisted Work Objects can be discovered from durable storage.
- Recovery reloads work into a fresh WorkStore and re-enters WorkEngine execution under a replacement owner.
- Expired leases are reaped before recovery; live owners remain authoritative and block execution with waiting_lease.
- Existing ambiguous effects remain governed by idempotency and reconciliation, so recovery does not blindly duplicate an external write.
- Stale owners cannot renew or release after ownership has moved.

## Verification evidence

- Main commit: b7a1bacd0d47baab7d759bb572351434ac5fdb60
- Merged-main CI #422: success.
- Source audit: 102/102 required paths.
- Dependency security audit: success.
- Retention lifecycle suite: passed.
- Full sequential unit/integration suite: passed.
- Benchmark: passed.
- Demo and CLI mission: verified.
- Live GitHub smoke: verified.

## Safety boundary

Leases provide ownership coordination within their authority; they do not provide exactly-once semantics for arbitrary external systems or distributed consensus.

A capability receipt is not proof of the final outcome. External side effects require independent verification or reconciliation.

SHA-256 is tamper-evident integrity metadata, not a cryptographic signature.

Ed25519 signatures authenticate a proof under the embedded public key; trusted-key acceptance, rotation, revocation, and distribution remain separate policy concerns.

Garbage collection never treats age alone as sufficient evidence for deletion. Protected roots, explicit retention, reachability, namespace scope, and content integrity are evaluated before deletion.

## Product boundary

WorkProof Runtime is not itself a generic agent framework, browser automation engine, workflow/queue product, memory database, observability backend, OSINT graph, or hosted identity provider. Those systems can be integrated as adapters while the Work Object, effect, verification, recovery, and proof semantics remain invariant.

## Next engineering gate

**v1.7 — authenticated control-plane and SDK foundation**

Expose status, dispatch, cancel, and resume through the existing authentication model, keep every transition durable/auditable, and provide SDK types that round-trip without changing Work Object or proof semantics.

This repository does not make a global novelty claim.
