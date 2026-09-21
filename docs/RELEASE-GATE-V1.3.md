# Release Gate v1.3-dev - Retention, Reachability, and Garbage Collection

Date: 2026-09-21

## Scope

Make the self-hosted proof vault lifecycle-complete enough to reason about retention and garbage collection without deleting reachable evidence.

## Acceptance gates

- [x] Content inventory covers proof and artifact objects.
- [x] Supplied registry trust snapshots are inventoried and treated as protected external content.
- [x] Default retention classes are deterministic.
- [x] Explicit retention overrides are persisted.
- [x] Protected pins support optional expiry.
- [x] Reachability propagates from retained proofs to referenced artifacts.
- [x] Dry-run GC produces a deterministic candidate set without deletion.
- [x] Proof and artifact integrity are checked before deletion eligibility.
- [x] Namespace-scoped GC is conservative for unscoped content.
- [x] Execute mode journals before mutation and updates authoritative proof index before deletion.
- [x] Audit events record lifecycle mutations and deletion outcomes.
- [x] Repair removes stale index references and recovers stale GC journals.
- [x] CLI exposes inventory, retention, pin, unpin, GC, and repair operations.
- [ ] Distributed object-store GC.
- [ ] Cross-registry GC consensus.
- [ ] Hosted lifecycle control.

## Safety boundary

A content object is deletable only when it is outside active retention, outside protected roots, unreachable from retained proofs, within the requested namespace boundary, and integrity-verified.

A corrupt or unverified object is surfaced as a warning rather than silently destroyed.

## Milestone result

The v1.3-dev retention/GC milestone is complete only after feature CI and merged-main CI both pass.
