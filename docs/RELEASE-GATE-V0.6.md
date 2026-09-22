# Release Gate v0.6-dev - User-Facing Proof Integrity

Date: 2026-09-21

## Scope

Make proof integrity a user-facing CLI guarantee rather than a library-only test.

## Acceptance gates

- [x] Run command emits a proof bundle plus integrity manifest.
- [x] Verify command validates the integrity digest when present.
- [x] Verify command preserves compatibility with legacy proofs without a manifest.
- [x] Tampered proof content is rejected with a dedicated integrity failure exit code.
- [x] Automated test covers intact and tampered proof verification.
- [ ] Signed proof identity / non-repudiation.
- [ ] Remote proof registry and artifact retention.
- [ ] Multi-user trust policy for proof acceptance.

## Safety boundary

SHA-256 provides tamper-evident integrity against accidental or unauthorized modification of the proof bundle when the manifest is trusted. It is not a digital signature and does not prove who created the proof.

## Milestone result

The v0.6-dev proof CLI milestone is complete only after the feature branch and merged main CI both pass.
