# Release Gate v0.8-dev - Trusted Proof Identities

Date: 2026-09-21

## Scope

Add explicit local trust policy on top of cryptographic proof signatures.

## Acceptance gates

- [x] Local trust policy document with stable key IDs.
- [x] Trusted and revoked key states.
- [x] Persistent JSON trust policy.
- [x] Cryptographic signature remains distinct from trust policy.
- [x] Key rotation path represented by trust-new + revoke-old.
- [x] Unknown and mismatched identities remain untrusted.
- [x] CLI `trust-add`.
- [x] CLI `trust-revoke`.
- [x] Optional `--require-trusted` verification mode.
- [x] End-to-end regression tests for trusted, unknown, and revoked states.
- [ ] Multi-user distributed trust policy.
- [ ] Remote key registry and policy synchronization.

## Safety boundary

A cryptographically valid signature from an unknown key is not treated as a trusted proof. Revocation is local policy state and does not retroactively erase already-issued cryptographic signatures.

## Milestone result

The v0.8-dev local trust-policy milestone is complete only after feature CI and merged-main CI both pass.
