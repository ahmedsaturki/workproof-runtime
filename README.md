# WorkProof Runtime

Outcome-first digital work runtime: execute real work, reconcile external effects, verify outcomes, preserve proof, manage proof lifecycle, recover execution after worker loss, expose authenticated control, and provide a local operational Studio.

## Current status

**v3.2-dev declarative data transformation capability is verified on main.**

The verified v3.2 line adds a bounded, local, declarative JSON transformation capability for filter/projection/sort/limit workflows without evaluating user-provided code.

## Core loop

Goal -> Outcome Contract -> Capability -> Execute -> Observe/Reconcile -> Verify -> Recover/Substitute -> Deliver -> Proof -> Retain -> Control -> Compensate

## Verified platform

v1.0 through v3.1 remain verified foundations for proof registry/trust, retention, worker ownership/recovery, control-plane auth/idempotency/fencing, saga recovery, Studio control/audit, lease visibility, operational filtering/health, and local SQLite database work.

## v3.2 Data Transformation

- `pack.transform.json` transforms an input JSON array of objects into a bounded output artifact.
- Filtering uses explicit field names and primitive equality only.
- Projection uses an explicit allowlist of safe top-level fields.
- Sorting uses an explicit field and asc/desc direction with stable tie handling.
- Output is bounded to 500 rows.
- Input file size is bounded to 2 MiB.
- Input depth is bounded to 20 and scanned item count to 10,000.
- Selected field count is bounded to 50.
- Unsafe field names and malformed roots fail closed.
- No user-provided JavaScript, SQL, templates, or expressions are executed.
- Output is deterministic and produces evidence.
- The verifier re-reads the persisted output artifact and recomputes the expected deterministic result.
- The pack is classified `local_write` because it creates an output artifact.
- No new npm runtime dependency was introduced.
- CLI mission registration includes the transformation pack.

## v3.2 verification evidence

- feature CI #798: success.
- feature PR #69: merged.
- merged-main CI #800: success on `c3562b96df23c1c8d500c48e0591833e96236306`.
- final documentation/source audit CI: pending for the final audit commit.
- source-tree audit: 155 required paths before final audit documentation.
- dependency security audit: 0 vulnerabilities on the merged implementation.
- Chromium/CDP preflight: success.
- strict TypeScript build: success.
- retention lifecycle suite: success.
- full unit/integration suite: success.
- benchmark: success.
- demo: success.
- CLI proof verification and mission execution: success.
- live GitHub smoke: success.

## Safety boundary

The transformation language is intentionally declarative. It does not execute user-provided code or arbitrary expressions.

A capability receipt is not proof of the final outcome. The verifier observes the persisted output artifact independently.

Operational health is diagnostic only. Healthy workers, active leases, or previous verification do not prove a current external outcome.

## Product boundary

WorkProof Runtime is not a replacement for agents, browsers, workflow engines, MCP registries, memory systems, observability backends, or OSINT graphs. Those systems can be integrated as capabilities or adapters while Work Object, effect, verification, recovery, and proof semantics remain invariant.

## Next engineering gates

Additional capability packs/integrations and richer operational visualization remain separate milestones.

This repository does not make a global novelty claim.
