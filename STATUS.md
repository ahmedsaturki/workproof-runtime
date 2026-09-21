# WorkProof Runtime Status

Date: 2026-09-21

## Current main

v1.0-dev self-hosted proof registry is verified on main.

Current main commit:
265a580b1352a610957e88c0954a02e736ad6886

Latest main CI:
- run #175: success
- source audit: 75/75 required paths verified
- automated tests: 55/55 passed
- benchmark: passed
- demo: verified
- CLI proof verification + mission execution: verified
- live GitHub repository smoke: passed

## Verified proof foundation

- [x] v0.6 user-facing proof integrity CLI.
- [x] v0.7 Ed25519 signed proof identity.
- [x] v0.8 local trusted proof policy.
- [x] v0.9 content-addressed local proof vault.
- [x] v1.0 self-hosted proof registry and verified HTTP client.

## Verified v1.0 registry

- [x] HTTP health endpoint.
- [x] Proof publication by POST.
- [x] Proof list endpoint.
- [x] Digest-based proof metadata retrieval.
- [x] Digest-based proof content retrieval.
- [x] Client-side integrity check before publication.
- [x] Client-side digest verification after retrieval.
- [x] Server-side integrity enforcement before retention.
- [x] Server-side re-verification before egress.
- [x] Idempotent duplicate publication.
- [x] Malformed JSON rejection.
- [x] Corrupted retained proof detection.
- [x] Local/self-hosted operation without a managed dependency.
- [x] End-to-end registry server/client test coverage.
- [x] Release-candidate CI passed.
- [x] Merged-main CI run #175 passed completely.

## Active next gate

v1.1 authenticated multi-user registry and trust synchronization.

Target:
- Pluggable authentication for registry clients.
- Explicit read/write authorization.
- Namespace or tenant isolation.
- Trust-policy synchronization with cryptographic-vs-policy separation.
- Audit evidence for authorization decisions.
- End-to-end unauthorized/authorized access tests.

## Remaining platform work
- [ ] v1.1 authenticated multi-user registry.
- [ ] Distributed trust synchronization.
- [ ] Retention/garbage-collection policy.
- [ ] Generalized compensation/saga engine.
- [ ] External browser navigation where permitted.
- [ ] Distributed/remote workers and control plane.
- [ ] Studio / REST / SDK surfaces.
- [ ] Hosted/managed deployment.

## Verification rule

A successful tool response is a receipt, not proof. Work is verified only when independent evidence satisfies the Work Contract success criteria.