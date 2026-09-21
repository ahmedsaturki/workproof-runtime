# WorkProof Runtime Status

Date: 2026-09-21

## Current main

v0.7-dev signed-proof identity is verified on main.

Verified v0.7 runtime commit:
e4f3711861e31cec3fff923be3fbba045d3487f5

Current `main` adds documentation-only finalization on top of that runtime. The final HEAD is accepted only when its own CI passes.

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

## Next engineering gate

Open issue #6 covers v0.8 trusted proof identities and key lifecycle policy:
- local trusted-key registry
- trusted / revoked / unknown states
- optional required-trusted-signature verification
- key rotation and revocation semantics

## Remaining platform work

- [ ] v0.8 trusted proof identity policy.
- [ ] Remote proof registry and artifact retention.
- [ ] Generalized compensation/saga engine.
- [ ] External browser navigation where permitted.
- [ ] Distributed/remote workers and control plane.
- [ ] Studio / REST / SDK surfaces.

## Historical checkpoints

### v0.5
- commit: e3010a83513ec25806cd9524481a2cca6dd5bbf2
- CI runs #34 and #35: success

### v0.6
- merged main commit: fc80cc859923731861f6a6a4df5246b1c0144ba2
- feature CI run #49: success
- final merged-main CI run #55: success

### v0.7
- merged runtime commit: e4f3711861e31cec3fff923be3fbba045d3487f5
- feature CI run #70: success
- merged-main CI run #71: success
- checkpoint branch: checkpoint/v0.7-signed-proof-verified

## Finalization note

The current main HEAD is documentation-only on top of the verified v0.7 runtime. The final repository-state gate is this branch's pull-request CI; merging is performed only after that check passes.

## Verification rule

A successful tool response is a receipt, not proof. Work is verified only when independent evidence satisfies the Work Contract success criteria.
