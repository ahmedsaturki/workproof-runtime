# WorkProof Runtime

Outcome-first digital work runtime: execute real work, reconcile external effects, verify outcomes, and preserve proof.

## Current status

**v1.1-dev authenticated multi-user registry is in progress.**

The proof boundary now has separate layers for integrity, cryptographic signature, trust policy, content-addressed retention, registry transport, and registry authorization.

## v1.1 authenticated registry

- Local registry credentials are generated as random bearer tokens; only SHA-256 hashes are persisted.
- `workctl registry-auth-init <policy.json>` creates an auth policy.
- `workctl registry-auth-add <policy.json> <credential-id> <read|write|readwrite> [namespace] [label]` issues a token once.
- `workctl registry-auth-revoke <credential-id> <policy.json> [reason]` revokes a credential.
- `workctl registry-auth-list <policy.json>` lists identities and permissions without secrets.
- Start the server with an optional auth policy as the fourth registry-server argument.
- Read and write permissions are enforced separately.
- Credentials can be bound to a namespace backed by a separate local vault root.
- Authorization decisions are appended to an audit log without plaintext tokens.
- Registry client publish/get/list calls accept an optional bearer token and re-check proof digest/integrity.

## Safety boundary

Transport authentication and authorization do not establish proof trust. Proof integrity, signature validity, and trust policy remain separate gates.

## Next engineering gate

v1.2 distributed trust-policy synchronization and policy-aware proof replication.

This repository does not make a global novelty claim.