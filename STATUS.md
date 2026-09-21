# WorkProof Runtime Status

Date: 2026-09-21

## Current main

v0.7-dev signed-proof identity is merged on main.

Current main commit:
5ea9aab16e7333621b639f7f96c0e5a4ad9852c8

Current main verification:
- [ ] final CI after deterministic signature-tamper regression fix

The v0.7 runtime itself passed feature CI run #70 and merged-main CI run #71; the later restoration commit exposed a nondeterministic regression fixture, now fixed on main.

## Active next branch

feature/v0.8-trust-policy

Target:
- local trusted-key registry
- explicit trusted / revoked / unknown identity states
- CLI trust-add / trust-revoke operations
- optional --require-trusted proof verification
- key lifecycle and rotation semantics without a network dependency

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

## v0.8 implemented on branch

- [x] Local JSON trust policy.
- [x] Trusted and revoked states.
- [x] Unknown/mismatched identity handling.
- [x] CLI trust-add.
- [x] CLI trust-revoke.
- [x] Optional --require-trusted verification mode.
- [x] Regression tests for trusted, unknown, and revoked proofs.
- [ ] Feature branch CI.
- [ ] Merged-main CI.

## Remaining platform work

- [ ] Remote proof registry and artifact retention.
- [ ] Distributed/multi-user trust policy.
- [ ] Generalized compensation/saga engine.
- [ ] External browser navigation where permitted.
- [ ] Distributed/remote workers and control plane.
- [ ] Studio / REST / SDK surfaces.

## Verification rule

A successful tool response is a receipt, not proof. Work is verified only when independent evidence satisfies the Work Contract success criteria.
