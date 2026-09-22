# Release Gate v2.3-dev - Durable Control Mutation Idempotency

Date: 2026-09-21

## Scope

Harden authenticated control-plane mutations against duplicate client retries, same-key races, and process restarts without claiming exactly-once semantics for external systems.

## Acceptance gates

- [x] Durable SQLite idempotency ledger.
- [x] Same key + same logical mutation replays without repeating the mutation.
- [x] Same key + different logical mutation is rejected.
- [x] Concurrent same-key mutation is blocked while the first is pending.
- [x] Completed idempotency records survive process restart.
- [x] Invalid idempotency keys are rejected at the control-plane boundary.
- [x] SDK exposes idempotency keys.
- [x] Studio generates and forwards per-action idempotency keys.
- [x] Studio preserves replay headers from the control plane.
- [x] Feature CI is green on final v2.3 head.
- [x] Merged-main CI #621 is green on merge commit 47e09002f135c0d2f999b2465e5bfbd291db4c22.

## Verification evidence

- Feature CI #619: success on final implementation head `fff08e3ee512649f784842c6eddd434f8e44f634`.
- Merged-main CI #621: success on merge commit `47e09002f135c0d2f999b2465e5bfbd291db4c22`.
- Source-tree audit: 126/126 on the implementation merge.
- Dependency security audit: 0 high vulnerabilities.
- Full sequential integration suite: 32/32 test files passed.
- Benchmark, demo, CLI proof, CLI mission, and live GitHub smoke all passed.

## Safety boundary

This ledger protects the control-plane mutation boundary. It does not replace external capability idempotency, reconciliation, or verification. Pending mutations fail closed rather than being blindly reclaimed.

## Milestone result

The v2.3-dev control-plane hardening milestone is verified on main. Final audit is recorded in docs/FINAL-AUDIT-V2.3.md.
