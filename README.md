# WorkProof Runtime

Outcome-first digital work runtime: execute real work, reconcile external effects, verify outcomes, preserve proof, manage proof lifecycle, recover execution after worker loss, expose authenticated control, and provide a local operational Studio.

## Current status

**v3.1-dev SQLite database capability pack is verified on main.**

The verified v3.1 line extends v3.0 with a bounded local SQLite capability family for real file-backed database work, independent verification, and explicit local-write semantics without adding a runtime dependency.

## Core loop

Goal -> Outcome Contract -> Capability -> Execute -> Observe/Reconcile -> Verify -> Recover/Substitute -> Deliver -> Proof -> Retain -> Control -> Compensate

## Verified platform gates

v1.0 through v3.0 are preserved as verified milestones, covering proof registry and trust, retention, worker ownership and recovery, control-plane idempotency, fencing, saga recovery, authenticated Studio control, proof/audit, lease visibility, operational filtering, and operational health projection.

## v3.1 SQLite database pack

- `pack.database.sqlite.query` executes one SELECT statement against a local SQLite file.
- SQL length is bounded to 20,000 characters.
- Query parameters are bounded to 50 supported values.
- Result output is bounded to 500 rows and reports truncation explicitly.
- `pack.database.sqlite.upsert` provides parameterized upsert semantics with an explicit conflict key.
- Upsert risk is declared `local_write`.
- Identifiers are constrained to safe SQLite identifier syntax.
- Query and upsert outcomes produce evidence references.
- Independent verifiers re-read persisted SQLite state instead of trusting capability receipts.
- The pack uses Node 24's built-in `node:sqlite`; no new npm runtime dependency is required.
- CLI mission registration includes the SQLite pack.
- Pack compatibility metadata and fixture-backed tests are included.

## v3.1 verification evidence

- feature CI #793: success on the final v3.1 feature head.
- merged-main CI #795: success on merge commit `449ad75806c3c0f1dab748598dd1f85c65047afc`.
- source-tree audit: 150/150 before final audit documentation.
- dependency security audit: 0 vulnerabilities.
- Chromium/CDP preflight: success.
- strict TypeScript build: success.
- retention lifecycle suite: success.
- full unit/integration suite: success.
- benchmark: success.
- demo: success.
- CLI proof verification: success.
- CLI mission execution: success.
- live GitHub smoke: success.

## Safety boundary

A capability receipt is not proof of the final outcome. External side effects require independent state verification or reconciliation.

Operational health is diagnostic only. Healthy workers, active leases, or prior verification do not prove a current external outcome.

The SQLite pack is local-only. It does not expose arbitrary write SQL, and its upsert operation is not a claim of third-party exactly-once behavior.

Compensation is not guaranteed rollback. The runtime records what was attempted, what was independently verified, and what remains unresolved.

Proof integrity and signatures establish integrity and authenticity under their defined trust boundaries; they do not create an organization-wide trust or revocation policy by themselves.

## Product boundary

WorkProof Runtime is not a replacement for agents, browsers, workflow engines, MCP registries, memory systems, observability backends, or OSINT graphs. Those systems can be integrated as capabilities or adapters while Work Object, effect, verification, recovery, and proof semantics remain invariant.

## Next engineering gates

Additional capability packs/integrations and richer operational visualization remain separate milestones.

This repository does not make a global novelty claim.
