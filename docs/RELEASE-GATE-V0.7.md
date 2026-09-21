# Release Gate v0.7-dev - Signed Proof Identity

Date: 2026-09-21

## Scope

Extend proof integrity with self-contained Ed25519 signatures so a proof can carry cryptographic identity without a network dependency.

## Acceptance gates

- [x] v0.6 integrity CLI behavior is included.
- [x] Generate an Ed25519 key pair from the CLI.
- [x] Sign a proof file with a private key.
- [x] Embed the public key and deterministic key identity in the proof.
- [x] Verify the signature independently from the original signing process.
- [x] Detect signature-only tampering separately from bundle-integrity tampering.
- [x] Keep verification compatible with unsigned/legacy proofs.
- [ ] Multi-user trust policy / trusted key registry.
- [ ] Key rotation / revocation semantics.
- [ ] Remote proof registry and artifact retention.

## Safety boundary

A valid Ed25519 signature authenticates a proof under the embedded public key. Trusting that key is a separate policy decision. No global identity, revocation, or non-repudiation claim is made by the runtime alone.

## Milestone result

The v0.7-dev signed-proof milestone is complete only after its feature branch and merged main CI both pass.
