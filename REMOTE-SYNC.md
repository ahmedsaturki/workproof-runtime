# WorkProof Runtime Remote-Sync History

Date: 2026-09-21

> Historical record. This file documents an earlier remote synchronization checkpoint; it is **not** the current project status. For current state and verified release evidence, use `STATUS.md`.

## Historical v0.5 checkpoint

At this checkpoint, main carried the merged v0.5-dev integration milestone at:

`d9af0d9358e3ceae4468bdf546f1990353feb7bb`

GitHub Actions run #34 passed the full CI pipeline for that checkpoint, including 28/28 automated tests and the live read-only GitHub smoke.

The checkpoint covered:
- GitHub read + independent verification
- approval-gated external write
- deterministic marker-based reconciliation
- two-system ambiguous-effect reconciliation
- persisted-effect resume protection
- SHA-256 proof integrity
- pack compatibility manifest
- strict input validation

## Subsequent evolution

The v0.5 checkpoint was later superseded by the subsequent verified v1-v3 lines. The current repository has advanced through worker/control-plane/recovery, proof retention/trust, deterministic local message outbox, the executable v3.4 operator benchmark, and the v3.4.0-dev.2 distribution path.

The current state is maintained in:
- `STATUS.md`
- `README.md`
- `SPEC.md`
- `docs/RELEASE-GATE-V3.4.md`

## Historical source-lineage note

The v0.4 source snapshot remains preserved by the exact local bundle and commit `8cd9b7d841191b8a030bb462ac8dbd271f8259ca`. Remote history was reconstructed through verified GitHub commits and was not a byte-identical copy of the local Git object database.

## Boundary

Do not use this file as evidence of the current runtime feature set. It is retained for provenance and historical synchronization context.
