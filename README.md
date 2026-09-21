# WorkProof Runtime

Outcome-first digital work runtime: execute real work, reconcile external effects, verify outcomes, preserve proof, manage proof lifecycle, recover execution after worker loss, expose authenticated control, and provide a local operational Studio.

## Current status

**v3.4 executable operator benchmark is fully verified, and v3.4.0-dev.2 is published as a verified prerelease distribution.**

The v3.4 line is the first executable operator benchmark with controlled failure injection across research, HTTP discovery, Git mutation, ambiguous external-effect reconciliation, and capability substitution.

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
- Documentation/source-tree closeout CI #811: success.
- Closeout record correction commit: `0c92a8c86950776243646de4bb40b0c0f2fe5876`.
- Closeout record correction CI #812: success.
- Dependency security audit: 0 vulnerabilities.
- Chromium/CDP preflight: success.
- Strict TypeScript build: success.
- Retention lifecycle suite: success.
- Full unit/integration suite: success.
- Benchmark: success.
- Demo: success.
- CLI proof verification and mission execution: success.
- Live GitHub smoke: success.

## v3.4 Executable Operator Benchmark

- PR #73 merged as `fe662d5bb5337bde18772f22864434935d59f66f`.
- Feature CI #864: success.
- Merged-main CI #866: success.
- Documentation/source-tree closeout CI #872: success.
- Final closeout record verification CI #875: success.
- Final main CI #893: success on `8d899f9a9abe0ef1a3aca316d717cc325b00b6c0`.

### Benchmark result

- M001-M005: 5/5 verified.
- verifiedCompletionRate: 1.0.
- falseDoneCount: 0.
- duplicateExternalEffectCount: 0.
- ambiguousOutcomeResolvedCount: 1.
- capabilitySubstitutionCount: 1.
- evidenceCompleteRate: 1.0.
- humanInterventionCount: 0.

M004 accepted an external effect whose acknowledgement was lost, reconciled existing state, and avoided a duplicate POST.

M005 retried the primary capability under bounded ambiguity, selected a compatible fallback, and independently verified the stored outcome.

## Distribution and operation

### GitHub Release

`v3.4.0-dev.2` is published as GitHub Release **393311702**, targeting commit `c1c1f378d0e79acfc4ee22d5d2ca3fa389e8402d`.

Published assets:

- `operational-reality-core-3.4.0-dev.2.tgz`
- `workproof-runtime-v3.4.0-dev.2.tar.gz`
- `workproof-benchmark-v3.4.0-dev.2.json`
- `RELEASE-MANIFEST.txt`
- `SHA256SUMS.txt`

The release pipeline re-downloads the published assets, verifies their SHA256 sums, verifies the release target matches the tag, and validates the published benchmark semantics. Release verification run #21 succeeded.

### GHCR container

Published image:

`ghcr.io/ahmedsaturki/workproof-runtime:3.4.0-dev.2`

Verified digest:

`sha256:2df71bf775272b9227979687de0c93d80f08814b83d7eb19e37e14dd63d8740b`

The same digest is exposed by the immutable release-tag commit tag `c1c1f378d0e79acfc4ee22d5d2ca3fa389e8402d). Container run #15 verified:

- package version matches release tag;
- OCI version matches `3.4.0-dev.2`;
- OCI revision matches the release tag commit;
- version and immutable commit tags resolve to the same digest;
- the published image starts successfully;
- `/health` returns status ok.

### Self-hosted runtime

The repository includes:

- `Dockerfile`
- `compose.production.yaml`
- `docs/CONTAINER-RUNTIME.md`
- `docs/PRODUCTION-DEPLOYMENT.md`

The production compose binds Studio to localhost and persists `./work-runs`. A public deployment requires an explicitly configured host, TLS reverse proxy, authentication/authorization, and production secrets; the repository does not pretend those external resources are provisioned.

`package.json` remains `private: true`; no npm registry publication is claimed.

## Safety boundary

The messaging capability is intentionally local-only. A capability receipt is not independent proof; the persisted message is re-read and verified. Remote delivery, external acknowledgement, and third-party exactly-once semantics remain outside v3.3.

## Product boundary

WorkProof Runtime is not a replacement for agents, browsers, workflow engines, MCP registries, memory systems, observability backends, or OSINT graphs. Those systems can integrate as capabilities or adapters while Work Object, effect, verification, recovery, and proof semantics remain invariant.

## Next engineering gates

The next product-validation line is broader real digital work: multi-capability missions, richer induced failure modes, and operational visualization. The existing benchmark establishes verified behavior for the current scope; it does not establish a universal production guarantee or a global novelty claim.
