# Release Gate v1.0-dev - Self-Hosted Proof Registry

Date: 2026-09-21

## Scope

Make WorkProof proof records portable across processes and machines through a self-hosted HTTP registry backed by the content-addressed local vault.

## Acceptance gates

- [x] HTTP health endpoint.
- [x] POST proof publication.
- [x] GET proof metadata by digest.
- [x] GET proof content by digest.
- [x] List retained proof records.
- [x] Reject malformed JSON.
- [x] Reject invalid-integrity proofs before retention.
- [x] Re-verify retained proof integrity on egress.
- [x] Idempotent duplicate publication.
- [x] Local/self-hosted operation with no managed service dependency.
- [x] End-to-end local HTTP regression tests.
- [ ] Authenticated multi-user access.
- [ ] Remote replication conflict policy.
- [ ] Retention/garbage-collection policy.
- [ ] Hosted/managed deployment.

## Safety boundary

The registry transports and stores proof; it does not establish trust. Integrity, cryptographic signature validity, and local trust policy remain separate verification gates.

## Milestone result

The v1.0-dev registry milestone is complete only after feature CI and merged-main CI both pass.
