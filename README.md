# WorkProof Runtime

Outcome-first digital work runtime: execute real work, reconcile external effects, verify outcomes, preserve proof, manage proof lifecycle, recover execution after worker loss, and expose authenticated control.

## Current status

**v1.7 authenticated control-plane and SDK foundation is verified on main.**

The main line combines durable Work Objects, signed proof identity, trusted signer policy, authenticated proof registry transport, proof-vault lifecycle management, persistent cross-process lease authority, worker registration/heartbeat/offline state, WorkEngine-bound execution leases, durable worker-loss recovery, and an authenticated control/SDK surface around the Work Object model.

## Core loop

Goal -> Outcome Contract -> Capability -> Execute -> Observe/Reconcile -> Verify -> Recover/Substitute -> Deliver -> Proof -> Retain -> Control

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
- v1.7 authenticated control-plane and SDK foundation.

## v1.7 control plane

- Authenticated GET /v1/work/:id for work retrieval.
- Authenticated POST dispatch/cancel/resume.
- Mutating actions carry audit request IDs.
- Verified/failed work cannot be cancelled remotely.
- Repeated cancellation is idempotent.
- Dispatch/resume remain injected boundaries so the control plane does not become a second workflow engine.

## v1.7 SDK

- Work Object types are re-exported from the kernel.
- Work Objects round-trip through JSON wire semantics.
- ControlPlaneClient exposes getWork, dispatch, cancel, and resume.
- Input validation happens before network access.
- HTTP authorization remains separate from proof signature/trust verification.

## Verification evidence

- Main merge commit: 86f8effb0e6178eb2f69d7b33472c7579be54d0f
- Merged-main CI #448: success.
- Source audit: 113/113 required paths.
- Dependency security audit: success.
- Retention lifecycle suite: passed.
- Full sequential unit/integration suite: passed.
- Benchmark: passed.
- Demo and CLI mission: verified.
- Live GitHub smoke: verified.

## Safety boundary

Authentication answers whether a caller may control work. Signed proof verification answers whether a proof authenticates under its embedded key. Trust policy answers whether that key is accepted.

Control-plane APIs do not provide exactly-once semantics for arbitrary external systems. Existing effect idempotency, reconciliation, verification, and execution-lease semantics remain authoritative.

Leases are ownership coordination, not proof of outcome or distributed consensus.

## Product boundary

WorkProof Runtime is not itself a generic agent framework, browser automation engine, workflow/queue product, memory database, observability backend, OSINT graph, distributed-consensus system, or hosted identity provider.

## Next engineering gate

**v1.8 — explicit saga/compensation semantics**

The next gate models compensation as explicit auditable work linked to the originating effect, with separate policy and risk semantics and no assumption that arbitrary external actions can be rolled back.

This repository does not make a global novelty claim.