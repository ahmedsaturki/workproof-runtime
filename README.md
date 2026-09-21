# WorkProof Runtime

Outcome-first digital work runtime: execute real work, reconcile external effects, verify outcomes, and preserve proof.

## Current status

v1.2-dev signed trust-policy synchronization core is in progress.

The proof boundary now separates integrity, cryptographic signature, trust policy, durable retention, registry transport, and registry authorization.

## v1.2 trust snapshots

- buildTrustPolicySnapshot creates a versioned snapshot with an explicit epoch and canonical SHA-256 digest.
- signTrustPolicySnapshot attaches an Ed25519 signature to the canonical snapshot envelope.
- verifyTrustPolicySnapshot checks snapshot shape, digest, signature, and an explicit administrative-key allowlist.
- reconcileTrustPolicySnapshot distinguishes accept, noop, conflict, rollback-required, untrusted-signer, and invalid.
- applyTrustPolicySnapshot never silently replaces a newer epoch.
- The synchronization core is transport-independent and does not claim distributed consensus.

## Security boundary

Registry authentication answers who may call the registry.
Proof signatures answer which key signed a proof.
Trust policy answers which proof identities are accepted.
Trust snapshots answer whether one trust-policy state may replace another.

## Next engineering gate

Registry-to-registry snapshot transport, revocation propagation, persistent rollback/audit history, retention garbage collection, generalized compensation/saga semantics, distributed workers/control plane, and Studio/REST/SDK remain separate milestones.

This repository does not make a global novelty claim.
