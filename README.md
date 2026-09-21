# WorkProof Runtime

Outcome-first digital work runtime: execute real work, reconcile external effects, verify outcomes, preserve proof, manage proof lifecycle, recover execution after worker loss, expose authenticated control, and provide a local operational Studio.

## Current status

**v2.9-dev operational work filtering is in progress.**

The active v2.9 line extends the verified v2.8 Studio with bounded search, status/risk filtering, result limits, and deterministic operational summaries. The filter layer is diagnostic only and does not alter execution or authorization semantics.

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
- v2.4 execution fencing token boundary.
- v2.5 worker lifecycle/reassignment hardening.
- v2.6 worker-aware Studio.
- v2.7 authenticated remote worker visibility.
- v2.8 diagnostic lease/fence visibility.

## v2.9 operational work filtering

- `GET /api/work` supports bounded free-text search by Work Object ID or objective.
- `GET /api/work` supports explicit status and risk filters.
- `GET /api/work` enforces a maximum result limit.
- Invalid filter inputs fail closed with HTTP 400.
- The API returns deterministic `total`, `byStatus`, and `byRisk` counts for the matched set.
- Studio exposes search, status, risk, and limit controls and renders summary cards from the filtered result set.
- Filtering never mutates a Work Object and never bypasses authorization, lease, proof, or control-plane semantics.

## v2.8 diagnostic lease/fence visibility

- The control plane exposes a read-only lease projection through `GET /v1/leases`.
- Studio exposes local and authenticated remote lease projections through `GET /api/leases`.
- Lease projections include resource, owner, lease identity, revision, timing, and active state.
- Studio and control-plane visibility surfaces do not expose execution fencing tokens.
- Remote lease visibility requires a valid bearer credential.
- Missing lease sources fail closed with HTTP 503.
- Persistent and in-memory lease authorities share the same sanitized LeaseStatus projection contract.
- Visibility routes are diagnostic and do not acquire, renew, release, or reassign leases.

## Final v2.8 verification evidence

- Initial implementation feature CI #708: success.
- Initial implementation PR CI #709: success.
- Initial merged-main CI #710: success.
- Finalization feature CI #726: success.
- Finalization PR CI #727: success.
- Final merged-main CI #728: success.
- Finalization corrected the source manifest to 141 required paths.
- Dependency security audit: 0 vulnerabilities.
- Chromium/CDP preflight: success.
- Strict TypeScript build: success.
- Retention lifecycle: success.
- Full unit/integration suite: success.
- Benchmark: success.
- Demo: success.
- CLI proof verification: success.
- CLI mission execution: success.
- Live GitHub smoke: success.

## Safety boundary

Compensation is not guaranteed rollback. The runtime records what was attempted, what was independently verified, and what remains unresolved.

Studio control is not a new control plane: authorization, state transitions, and mutation audits remain owned by the authenticated control-plane implementation.

Proof integrity and signatures establish integrity/authenticity properties under their defined trust boundaries; they do not create an organization-wide trust or revocation policy by themselves.

Control-plane idempotency protects the authenticated mutation boundary but does not make external capability execution exactly-once.

Execution fencing protects the WorkProof execution boundary. External systems must explicitly honor a fence token to obtain corresponding remote conditional-write protection.

Lease visibility is diagnostic only. A visible lease is not proof that a worker is healthy or that an external effect has stopped.

## Next engineering gates

Additional capability packs/integrations and richer operational visualization remain separate milestones.

This repository does not make a global novelty claim.
