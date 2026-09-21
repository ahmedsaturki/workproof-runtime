# WorkProof Runtime

Outcome-first digital work runtime: execute real work, reconcile external effects, verify outcomes, and preserve proof.

## Current status

v1.1-dev authenticated multi-user registry is verified on main.

The proof boundary separates integrity, cryptographic signature, trust policy, content-addressed retention, registry transport, and registry authorization.

## Verified v1.1 authenticated registry

- Local registry credentials are generated as random bearer tokens; only SHA-256 hashes are persisted.
- Read and write permissions are enforced separately.
- Credentials can be bound to namespaces backed by separate local vault roots.
- Authorization decisions are audited without plaintext bearer tokens.
- CLI credential lifecycle is available through workctl.
- Registry client publish/get/list calls support bearer credentials and re-check proof integrity/digest.
- Focused security regressions and a high-severity dependency audit are part of CI.
- Live GitHub read smoke remains part of the full acceptance pipeline.

## Security boundary

Transport authentication and authorization do not establish proof trust. Proof integrity, signature validity, and trust policy remain separate gates.

Namespace isolation is a local vault-root boundary, not a distributed authorization system.

## Next engineering gate

v1.2 signed trust-policy snapshots, deterministic reconciliation, and registry-to-registry policy synchronization.

This repository does not make a global novelty claim.
