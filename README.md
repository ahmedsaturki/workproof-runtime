# WorkProof Runtime

Outcome-first digital work runtime: execute real work, reconcile external effects, verify outcomes, and preserve proof.

## Current status

**v0.8-dev trusted-proof policy is in progress.**

WorkProof now has a three-layer proof boundary:
1. deterministic SHA-256 integrity,
2. Ed25519 cryptographic signature,
3. explicit local trust policy for the signing identity.

The active v0.8 branch adds trusted/revoked/unknown key state, local policy persistence, and optional policy-enforced CLI verification.

## Core loop

Goal -> Outcome Contract -> Capability -> Execute -> Observe/Reconcile -> Verify -> Recover/Substitute -> Deliver -> Proof

## Verified v0.5 scope

- GitHub REST repository read + independent verifier.
- GitHub issue creation declared as external_write.
- Human approval enforced before external-write execution.
- Deterministic idempotency marker with pre-write reconciliation.
- Lost-acknowledgement test proves one POST produces one issue.
- Two independent external systems reconcile ambiguous writes without duplicate writes.
- Persisted acknowledged effects are skipped on resume instead of being re-executed.
- Proof bundles support canonical SHA-256 integrity verification.
- GitHub pack compatibility is declared and tested.
- GitHub inputs are validated before network access.

## v0.6 proof CLI

- `workctl run` emits an integrity manifest with the proof.
- `workctl verify` validates the manifest when present.
- Integrity metadata is checked for version, algorithm, work identity, and digest shape.
- Tampered proof content returns an integrity-specific failure.
- Legacy proofs without an integrity manifest remain readable.

## v0.7 signed proof

- `workctl keygen <private.pem> <public.pem>` creates an Ed25519 identity.
- `workctl sign <proof.json> <private.pem>` embeds a self-contained proof signature.
- `workctl verify <proof.json>` independently validates the signature when present.
- Signature identity is bound to a SHA-256-derived key identifier.
- The signed payload is canonicalized and excludes only the signature field itself.
- Signature failure is distinct from proof-integrity failure.
- Key generation refuses accidental overwrite of existing key files.

## v0.8 trusted proof policy

- `workctl trust-add <public.pem> <trust-policy.json> [label]` adds or refreshes a trusted identity.
- `workctl trust-revoke <key-id> <trust-policy.json> [reason]` revokes a known identity.
- `workctl verify <proof.json> <trust-policy.json> --require-trusted` requires the signing identity to be trusted.
- Cryptographic validity remains separate from trust state.
- Unknown identities are not promoted to trusted automatically.
- Revoked identities remain cryptographically valid but fail the required-trust policy.

## Safety boundary

A capability receipt is not proof of the final outcome. External side effects require independent state verification or reconciliation.

GitHub issue idempotency is marker/reconciliation-based and is not an atomic exactly-once guarantee across concurrent independent writers.

SHA-256 integrity is tamper-evident metadata, not a cryptographic signature.

Ed25519 authenticates the proof under its embedded public key; a local trust policy decides whether that identity is accepted in a given environment.

The local trust policy is an explicit policy artifact, not a global identity or revocation service.

## Product boundary

WorkProof Runtime is not a replacement for agents, browsers, workflow engines, MCP registries, memory systems, or observability platforms. Those systems can be integrated as adapters while the Work Object, effect, verification, recovery, and proof semantics remain invariant.

## Next engineering gate

Remote proof/artifact retention and distributed trust synchronization come after the local trust-policy milestone.

This repository does not make a global novelty claim.
