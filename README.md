# WorkProof Runtime

Outcome-first digital work runtime: execute real work, reconcile external effects, verify outcomes, preserve proof, manage proof lifecycle, recover execution after worker loss, expose authenticated control, and provide a local operational Studio.

## Current status

**v2.0-dev Studio foundation is in progress.**

The active v2.0 branch adds a dependency-free, read-only local Studio over persisted Work Objects. The UI is backed by the same JSON Work Object repository used by the runtime and keeps control actions behind the authenticated control plane.

## Core loop

Goal -> Outcome Contract -> Capability -> Execute -> Observe/Reconcile -> Verify -> Recover/Substitute -> Deliver -> Proof -> Retain -> Control -> Compensate

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
- v1.8 explicit saga/compensation semantics.
- v1.9 durable saga recovery.

## v2.0 Studio foundation

- Local Studio is served directly by Node.js with no frontend framework dependency.
- Persisted Work Objects are listed from the authoritative JSON repository.
- A detail view exposes status, effects, artifacts, verification checks, and recent events.
- Sensitive execution inputs, constraints, and raw effect receipts are not exposed by the Studio API.
- The Studio API is read-only in this milestone.
- HTTP responses include no-store and browser hardening headers.
- CLI entrypoint: `npm run studio`.

## Safety boundary

Compensation is not guaranteed rollback. The runtime records what was attempted, what was independently verified, and what remains unresolved.

The Studio foundation is intentionally read-only. Dispatch, resume, and cancellation remain behind the authenticated control-plane contract.

Proof integrity and signatures establish integrity/authenticity properties under their defined trust boundaries; they do not create an organization-wide trust or revocation policy by themselves.

## Next engineering gates

Authenticated Studio controls through the control plane, broader distributed worker/control-plane hardening, additional capability packs/integrations, and richer proof/audit views remain separate milestones.

This repository does not make a global novelty claim.
