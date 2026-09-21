# Release Gate v0.9-dev - Content-Addressed Proof Vault

Date: 2026-09-21

## Scope

Make verified proof and local artifacts durable, portable, and content-addressed without requiring a hosted service.

## Acceptance gates

- [x] Store proofs by their SHA-256 integrity digest.
- [x] Refuse publication of proofs with invalid integrity.
- [x] Atomic proof and index writes.
- [x] Idempotent duplicate publication.
- [x] Retain local artifact files by content digest.
- [x] Detect corrupt retained proofs during restore.
- [x] Expose publish/list/inspect/restore through the CLI.
- [ ] Remote registry / replication.
- [ ] Multi-user retention authorization.
- [ ] Garbage collection / retention policy.

## Safety boundary

The vault is a durability layer. Proof integrity, signature validity, and trust policy remain separate acceptance gates.

## Milestone result

The v0.9 local proof-vault milestone is complete only after feature CI and merged-main CI both pass.
