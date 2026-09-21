# WorkProof Runtime

Outcome-first digital work runtime: execute real work, reconcile external effects, verify outcomes, preserve proof, manage proof lifecycle, recover execution after worker loss, expose authenticated control, and provide a local operational Studio.

## Current status

**v3.3-dev local deterministic message outbox is implementation-verified on main; this commit is the documentation/source-tree closeout state.**

The v3.3 line adds a bounded, deterministic local messaging outbox without external SMTP delivery.

## Core loop

Goal -> Outcome Contract -> Capability -> Execute -> Observe/Reconcile -> Verify -> Recover/Substitute -> Deliver -> Proof -> Retain -> Control -> Compensate

## Verified platform

v1.0 through v3.2 remain verified foundations for proof registry/trust, retention, worker ownership/recovery, control-plane auth/idempotency/fencing, saga recovery, Studio control/audit, lease visibility, operational filtering/health, local SQLite work, and deterministic data transformation.

## v3.3 Local Message Outbox

- `pack.messaging.outbox` composes a local RFC-style text/plain message.
- Message identity is deterministic from a canonical SHA-256 representation.
- The Message-ID is content-derived and stable for identical payloads.
- Messages are persisted as digest-addressed `.eml` files.
- Repeated identical payloads resolve to the same artifact without duplicates.
- Concurrent creation is race-safe through exclusive file creation and re-read reconciliation.
- Addresses are strictly validated and bounded.
- Header injection is rejected.
- Subject, body, and final message sizes are bounded.
- Only the explicit `compose` operation is registered.
- Capability results include evidence.
- The verifier independently re-reads the persisted artifact and compares the canonical representation.
- The pack is classified `local_write`.
- No external SMTP or remote message send is performed.
- No new npm runtime dependency was introduced.
- CLI mission registration includes the outbox pack.

## v3.3 verification evidence

- Feature CI #808: success.
- PR #71: merged.
- Merged-main CI #809: success on `c5e951056461c37f45bed8bb8406d119880d63df`.
- Source-tree audit on merged implementation: 162 required paths.
- Dependency security audit: 0 vulnerabilities.
- Chromium/CDP preflight: success.
- Strict TypeScript build: success.
- Retention lifecycle suite: success.
- Full unit/integration suite: success.
- Benchmark: success.
- Demo: success.
- CLI proof verification and mission execution: success.
- Live GitHub smoke: success.

## Safety boundary

The messaging capability is intentionally local-only. A capability receipt is not independent proof; the persisted message is re-read and verified. Remote delivery, external acknowledgement, and third-party exactly-once semantics remain outside v3.3.

## Product boundary

WorkProof Runtime is not a replacement for agents, browsers, workflow engines, MCP registries, memory systems, observability backends, or OSINT graphs. Those systems can integrate as capabilities or adapters while Work Object, effect, verification, recovery, and proof semantics remain invariant.

## Next engineering gates

Additional capability packs and richer end-to-end operator benchmarks are the next expansion points. The repository does not make a global novelty claim.
