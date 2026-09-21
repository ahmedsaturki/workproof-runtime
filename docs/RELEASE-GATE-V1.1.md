# Release Gate v1.1-dev - Authenticated Multi-User Proof Registry

Date: 2026-09-21

## Scope

Extend the verified self-hosted registry with explicit transport authentication, authorization, namespace isolation, and audit evidence without requiring a managed identity provider.

## Acceptance gates
- [x] Local credential policy with hashed bearer secrets.
- [x] Constant-time token hash comparison.
- [x] Explicit read/write permissions.
- [x] Namespace-scoped vault isolation.
- [x] Public health endpoint remains available.
- [x] Unauthorized requests return 401.
- [x] Authenticated requests with insufficient permission return 403.
- [x] Revoked credentials are denied.
- [x] Credential lifecycle is available from workctl.
- [x] Registry client can send bearer credentials.
- [x] Auth decisions emit audit records without storing plaintext tokens.
- [x] Malformed and invalid proof protections remain active.
- [x] Missing proof digest maps to 404.
- [x] End-to-end authorization and namespace tests.
- [ ] Distributed trust-policy synchronization.
- [ ] Remote identity providers.
- [ ] Replication conflict policy.
- [ ] Hosted/managed deployment.

## Safety boundary

Registry authentication establishes transport authorization only. Proof integrity, signature validity, and proof trust remain independent layers.

Namespace isolation is implemented as separate local vault roots selected by credential policy. It is not a distributed authorization system.

Credential tokens are emitted once by the issuance command and only their SHA-256 hashes are persisted.

## Milestone result

The v1.1-dev authenticated registry milestone is complete only after feature CI and merged-main CI both pass.