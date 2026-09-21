# WorkProof Runtime

Outcome-first digital work runtime: execute real work, reconcile external effects, verify outcomes, and preserve proof.

## Current status

**v0.9-dev local proof vault is in progress.**

WorkProof's proof boundary now has four separable concerns:
1. deterministic SHA-256 integrity,
2. Ed25519 cryptographic signature,
3. explicit trust policy,
4. durable content-addressed retention.

The v0.9 branch adds a local proof vault so verified proofs and local artifacts can be retained and restored without a hosted dependency.

## Core loop

Goal -> Outcome Contract -> Capability -> Execute -> Observe/Reconcile -> Verify -> Recover/Substitute -> Deliver -> Proof

## v0.6 proof CLI

- `workctl run` emits an integrity manifest with the proof.
- `workctl verify` validates the manifest when present.
- Tampered proof content returns an integrity-specific failure.
- Legacy proofs without an integrity manifest remain readable.

## v0.7 signed proof

- `workctl keygen <private.pem> <public.pem>` creates an Ed25519 identity.
- `workctl sign <proof.json> <private.pem>` embeds a self-contained proof signature.
- `workctl verify <proof.json>` independently validates the signature when present.
- Signature failure is distinct from proof-integrity failure.
- Key generation refuses accidental overwrite of existing key files.

## v0.8 trusted proof policy

- `workctl trust-add <public.pem> <trust-policy.json> [label]` adds or refreshes a trusted identity.
- `workctl trust-revoke <key-id> <trust-policy.json> [reason]` revokes a known identity.
- `workctl verify <proof.json> <trust-policy.json> --require-trusted` requires the signing identity to be trusted.
- Cryptographic validity remains separate from trust state.
- Unknown identities are not promoted to trusted automatically.
- Revoked identities remain cryptographically valid but fail the required-trust policy.

## v0.9 proof vault

- `workctl vault-publish <proof.json> <vault-dir>` stores a proof by its content digest.
- `workctl vault-list <vault-dir>` lists retained proof records.
- `workctl vault-inspect <digest> <vault-dir>` shows a single retained record.
- `workctl vault-restore <digest> <vault-dir> <output.json>` verifies and restores a proof.
- Publishing the same digest twice is idempotent.
- Local artifact files referenced by retained proofs are copied into the vault by SHA-256 content digest.
- Corrupt vault proofs are rejected during restore.

## Safety boundary

A capability receipt is not proof of the final outcome. External side effects require independent state verification or reconciliation.

SHA-256 integrity is tamper-evident metadata, not a cryptographic signature.

Ed25519 authenticates a proof under its embedded public key; the local trust policy decides whether that identity is accepted.

The proof vault provides durability, not trust. Vault records are re-verified on publication and restore.

## Product boundary

WorkProof Runtime is not a replacement for agents, browsers, workflow engines, MCP registries, memory systems, or observability platforms. Those systems can be integrated as adapters while the Work Object, effect, verification, recovery, and proof semantics remain invariant.

## Next engineering gate

Remote proof registry / replicated retention comes after the local content-addressed vault is verified.

This repository does not make a global novelty claim.
