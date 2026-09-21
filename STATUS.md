# WorkProof Runtime Status

Date: 2026-09-21

## Current main

v0.8-dev trusted proof policy is verified on main.

Current main commit:
df6365d0fb7793bcdeb049f97c4a9f5ab6ec7403

Latest main CI:
- run #103: success
- v0.8 trusted-proof policy is verified on main

## Active next branch

feature/v0.9-proof-vault

The branch carries the verified v0.8 trust-policy work plus content-addressed proof-vault retention.

## Verified v0.7 gates

- [x] v0.6 user-facing proof integrity CLI.
- [x] Ed25519 key generation.
- [x] CLI proof signing.
- [x] Embedded public key and deterministic key identity.
- [x] Independent signature verification.
- [x] Separate signature tamper failure.
- [x] Proof-integrity tamper detection.
- [x] Unsigned/legacy compatibility.
- [x] Key overwrite protection.
- [x] Feature branch CI run #70.
- [x] Merged-main CI run #71.
- [x] Final deterministic regression repair verified by main CI run #82.
- [x] v0.8 trusted-proof policy verified by merged-main CI run #103.

## v0.8 trust-policy branch

- [x] Local JSON trust policy.
- [x] Trusted and revoked states.
- [x] Unknown/mismatched identity handling.
- [x] Ed25519-only trust enrollment.
- [x] CLI trust-add / trust-revoke.
- [x] Optional --require-trusted verification.
- [x] Feature CI final gate (v0.8 PR run #96).
- [x] Merged-main CI final gate (main run #103).

## v0.9 proof vault branch

- [x] Content-addressed proof storage by SHA-256 digest.
- [x] Atomic proof/index writes.
- [x] Local artifact retention with SHA-256 content names.
- [x] Idempotent duplicate publication.
- [x] Integrity validation before publication/restore.
- [x] CLI publish/list/inspect/restore lifecycle.
- [ ] Feature CI final gate.
- [ ] Merged-main CI final gate.

## Remaining platform work

- [ ] Remote proof registry and artifact retention.
- [ ] Distributed/multi-user trust policy.
- [ ] Generalized compensation/saga engine.
- [ ] External browser navigation where permitted.
- [ ] Distributed/remote workers and control plane.
- [ ] Studio / REST / SDK surfaces.

## Verification rule

A successful tool response is a receipt, not proof. Work is verified only when independent evidence satisfies the Work Contract success criteria.
