# WorkProof Runtime

Outcome-first digital work runtime: execute real work, reconcile external effects, verify outcomes, and preserve proof.

## Current status

**v0.7-dev signed-proof identity is verified on `main`.**

The runtime now carries the user-facing v0.6 proof integrity CLI plus self-contained Ed25519 proof signatures. Proof files can be signed with a generated key pair and independently verified without contacting a remote service. The current `main` HEAD adds documentation-only finalization on top of the verified v0.7 runtime.

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
- Private keys are written with owner-only permissions by the CLI on supported filesystems.
- Key generation refuses accidental overwrite of existing key files.

## Verification evidence

- Feature branch CI run #70: success.
- Merged-main CI run #71: success.
- Source-tree audit: 64 required paths, none missing.
- `npm run check`: success, including 33 automated tests and the live GitHub smoke.
- Browser, HTTP ambiguity/reconciliation, publication, persisted-effect, approval, substitution, and two-system regression paths remain covered.

## Safety boundary

A capability receipt is not proof of the final outcome. External side effects require independent state verification or reconciliation.

GitHub issue idempotency is marker/reconciliation-based and is not an atomic exactly-once guarantee across concurrent independent writers.

SHA-256 integrity is tamper-evident metadata, not a cryptographic signature.

Ed25519 signatures provide cryptographic authenticity for a proof when the public key is trusted; they do not by themselves establish a trust policy or key revocation/distribution system.

Private proof-signing keys are currently emitted as PKCS#8 PEM with owner-only file permissions; they are not encrypted at rest by the CLI.

## Product boundary

WorkProof Runtime is not a replacement for agents, browsers, workflow engines, MCP registries, memory systems, or observability platforms. Those systems can be integrated as adapters while the Work Object, effect, verification, recovery, and proof semantics remain invariant.

## Next engineering gate

v0.8 is tracked in issue #6: local trusted-key policy, explicit trusted/revoked/unknown states, optional required-signature policy, and key lifecycle semantics.

Remote proof/artifact retention, generalized compensation/saga semantics, external browser navigation where permitted, worker/process boundaries, remote control-plane/API/SDK surfaces, and user-facing Studio remain separate milestones.

This repository does not make a global novelty claim.
