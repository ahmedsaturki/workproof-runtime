# WorkProof Runtime

Outcome-first digital work runtime: execute real work, reconcile external effects, verify outcomes, preserve proof, manage proof lifecycle, recover execution after worker loss, expose authenticated control, and provide a local operational Studio.

## Current status

**v2.3-dev control-plane hardening is verified on main.**

v2.1 established authenticated Studio control delegation through the control plane. v2.2 added read-only proof/audit views backed by the content-addressed proof vault and optional local trust policy. v2.3 adds durable idempotency and replay/concurrency protection for authenticated control mutations.

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
- v2.2 proof/audit Studio.
- v2.3 durable control mutation idempotency.

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

## v2.2 proof/audit Studio

- Optional proof-vault configuration enables retained proof discovery by Work Object.
- Proof audit reports integrity, signature, and local trust state without exposing vault filesystem paths.
- Retained proof detail includes bounded verification metadata and artifact count.
- Corrupted retained proofs fail closed as invalid audit records.
- Missing proof vault configuration returns a clear `503` rather than fabricating proof state.
- Proof/audit endpoints are read-only and use the existing Studio hardening/no-store boundary.

## v2.3 control-plane idempotency

- Authenticated mutation endpoints use a durable SQLite idempotency ledger when configured.
- Dispatch, cancel, and resume mutations require an `Idempotency-Key` when the ledger is configured.
- Reusing the same key for the same logical mutation replays the stored response without repeating the mutation.
- Reusing a key for a different operation or payload is rejected as a conflict.
- Concurrent use of the same key is fail-closed while the original mutation is pending.
- Completed idempotency records survive control-plane process restart.
- The SDK exposes mutation idempotency keys, and Studio generates per-action keys for control delegation.
- The control-plane ledger is separate from external capability idempotency and does not claim exactly-once third-party execution.

## v2.3 verification evidence

Merged v2.3 commit:
`47e09002f135c0d2f999b2465e5bfbd291db4c22`

Verified merged-main CI:
- CI #621: success
- source-tree audit: 126/126
- dependency security audit: 0 vulnerabilities
- Chromium/CDP preflight: success
- strict TypeScript build: success
- retention lifecycle suite: success
- sequential integration suite: 32/32 test files passed
- benchmark: passed
- demo: passed
- CLI proof verification: passed
- CLI mission execution: passed
- live GitHub integration smoke: verified

## Safety boundary

Compensation is not guaranteed rollback. The runtime records what was attempted, what was independently verified, and what remains unresolved.

Studio control is not a new control plane: authorization, state transitions, and mutation audits remain owned by the authenticated control-plane implementation.

Proof integrity and signatures establish integrity/authenticity properties under their defined trust boundaries; they do not create an organization-wide trust or revocation policy by themselves.

Control-plane idempotency protects the authenticated mutation boundary but does not make external capability execution exactly-once.

## Next engineering gates

Broader distributed worker/control-plane hardening, richer visualization beyond the proof/audit surface, additional capability packs/integrations, and remote/distributed Studio mode remain separate milestones.

This repository does not make a global novelty claim.
