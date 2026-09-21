# WorkProof Runtime

Outcome-first digital work runtime: execute real work, reconcile external effects, verify outcomes, preserve proof, manage proof lifecycle, recover execution after worker loss, expose authenticated control, and provide a local operational Studio.

## Current status

**v2.1-dev authenticated Studio control is verified on main.**

v2.0 established a dependency-free, read-only local Studio over persisted Work Objects. v2.1 adds a thin same-origin control proxy that delegates dispatch, cancel, and resume to the authenticated control plane without introducing a second authorization system.

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
- v2.0 local read-only Studio.
- v2.1 authenticated Studio control delegation.

## v2.1 authenticated Studio control

- Studio control routes are same-origin and proxy to the authenticated control plane.
- Browser control uses a bearer token supplied by the operator and kept only in page memory.
- Dispatch, cancel, and resume are delegated to the control plane; Studio does not authorize them independently.
- Missing or malformed bearer credentials are rejected before forwarding.
- Successful control responses are sanitized before leaving the Studio boundary.
- Control-plane request IDs and audit behavior remain authoritative.
- Control routes return `503` when no control plane is configured, rather than mutating local state.
- The Studio has no direct Work Object mutation path.
- v2.0 read endpoints and hardening headers remain intact.

## Safety boundary

Compensation is not guaranteed rollback. The runtime records what was attempted, what was independently verified, and what remains unresolved.

Studio control is not a new control plane: authorization, state transitions, and mutation audits remain owned by the authenticated control-plane implementation.

Proof integrity and signatures establish integrity/authenticity properties under their defined trust boundaries; they do not create an organization-wide trust or revocation policy by themselves.

## Next engineering gates

Broader distributed worker/control-plane hardening, trusted-key policy surfaces, richer proof/audit views, additional capability packs/integrations, and remote/distributed Studio mode remain separate milestones.

This repository does not make a global novelty claim.
