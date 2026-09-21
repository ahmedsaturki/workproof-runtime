# WorkProof Runtime

Outcome-first digital work runtime: execute real work, reconcile external effects, verify outcomes, preserve proof, manage proof lifecycle, recover execution after worker loss, expose authenticated control, and provide a local operational Studio.

## Current status

**v3.0-dev operational health projection is in progress.**

The active v3.0 line extends the verified v2.9 Studio with a read-only operational health projection and deterministic attention queue derived from persisted Work Objects, effects, verification state, and optionally configured worker and lease sources.

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
- v2.9 operational work filtering and summaries.

## v2.9 operational work filtering

- `GET /api/work` supports bounded free-text search by Work Object ID or objective.
- `GET /api/work` supports exact status and risk filters.
- `GET /api/work` enforces a maximum result limit.
- Search input is bounded to 200 characters.
- Invalid filter inputs fail closed with HTTP 400.
- The API returns deterministic `total`, `byStatus`, and `byRisk` counts for the matched set.
- Matching results are deterministically ordered by updated timestamp and Work Object ID.
- Studio exposes search, status, risk, and limit controls and renders summary cards from the filtered result set.
- Filtering never mutates a Work Object and never bypasses authorization, lease, proof, or control-plane semantics.

## v2.9 verification evidence

- v2.9 feature/PR CI #750: success.
- v2.9 merged-main CI #751: success for the merged implementation.
- CI preflight hardening PR #63 CI #760: success.
- Final merged-main CI #761: success after the hardening was merged.
- source-tree audit: 143/143.
- dependency security audit: 0 vulnerabilities.
- Chromium/CDP preflight: success.
- strict TypeScript build: success.
- retention lifecycle: success.
- full unit/integration suite: success.
- benchmark: success.
- demo: success.
- CLI proof verification: success.
- CLI mission execution: success.
- live GitHub smoke: success.

## CI reliability hardening

The final v2.9 main line runs the Chromium CDP preflight with an explicit headless Linux D-Bus-safe environment instead of relying on runner session state. This was independently exercised by PR #63 and merged-main CI #761.

## Safety boundary

Compensation is not guaranteed rollback. The runtime records what was attempted, what was independently verified, and what remains unresolved.

Studio control is not a new control plane: authorization, state transitions, and mutation audits remain owned by the authenticated control-plane implementation.

Proof integrity and signatures establish integrity/authenticity properties under their defined trust boundaries; they do not create an organization-wide trust or revocation policy by themselves.

Control-plane idempotency protects the authenticated mutation boundary but does not make external capability execution exactly-once.

Execution fencing protects the WorkProof execution boundary. External systems must explicitly honor a fence token to obtain corresponding remote conditional-write protection.

Lease visibility is diagnostic only. A visible lease is not proof that a worker is healthy or that an external effect has stopped.

Operational filtering is diagnostic only. It does not change work state, authorization, lease ownership, proof state, or execution.

## v3.0 operational health

- GET /api/operations/overview provides a read-only projection of durable Work Object health.
- Work summaries include total and verified counts plus status and risk distributions.
- Effect summaries distinguish observed effect states and count unknown and unresolved effects needing attention.
- Verification summaries distinguish verified, failed, partial, unverifiable, and not-present states.
- Optional worker health summarizes configured worker liveness and reassignment eligibility.
- Optional lease health summarizes configured active and expired leases.
- Attention items expose explicit reason codes for failed, unresolved, partial, waiting, unverifiable, unknown-effect, and failed-verification conditions.
- Attention output is bounded and deterministically ordered.
- The projection never mutates work, leases, proofs, authorization, or execution.

## Next engineering gates

Additional capability packs/integrations and richer visualization remain separate milestones.

This repository does not make a global novelty claim.
