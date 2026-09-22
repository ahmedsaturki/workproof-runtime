# Release Gate v2.9-dev - Operational Work Filtering

Date: 2026-09-21

## Scope

Turn the local Studio from a broad dashboard into an operator-oriented work view with bounded search, status/risk filtering, result limits, and deterministic operational summaries.

## Acceptance gates

- [x] `/api/work` supports bounded text search across Work Object ID and objective.
- [x] `/api/work` supports explicit status filtering.
- [x] `/api/work` supports explicit risk-class filtering.
- [x] `/api/work` enforces a safe result limit.
- [x] Invalid status, risk, and limit inputs fail closed with HTTP 400.
- [x] The response provides deterministic total, status, and risk counts for the matched set.
- [x] Studio exposes search, status, risk, and limit controls.
- [x] Studio displays operational summary cards for the filtered set.
- [x] Existing worker, lease, control, proof, retention, and security surfaces remain intact.
- [ ] Additional capability-pack coverage beyond the current foundations.

## Safety boundary

Filtering is diagnostic only. It does not change Work Objects, lease ownership, authorization, proof state, or execution semantics.

## Milestone result

The v2.9-dev operational filtering milestone is complete only after feature CI and merged-main CI both pass.
