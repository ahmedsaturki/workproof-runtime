# WorkProof Runtime Status

Date: 2026-09-21

## Current main

**v1.8 explicit saga and compensation semantics are verified on main.**

Main merge commit:
545dffda29c04249677f9605e5709f8e8c9d2ffb

Latest verified main CI:
- CI #476: success.
- final documentation CI #478: success.
- source audit: 111/111 required paths on the v1.8 checkpoint.
- dependency security audit: success.
- retention lifecycle suite: 9/9.
- full unit/integration suite: passed.
- benchmark: passed.
- demo: verified.
- CLI proof and mission: verified.
- live GitHub smoke: verified.

## Active next branch

feature/v1.9-saga-recovery

Target:
- durable saga recovery after worker/process loss.
- dedicated recovery lease ownership.
- replacement worker takeover after lease expiry.
- resume only pending compensation.
- stale-owner stop after ownership moves.
- ambiguous compensation reconciliation before retry.

## Verified v1.8 gates

- [x] First-class compensating effects with explicit identity.
- [x] Forward-effect to compensation linkage.
- [x] Compensation risk ceilings and approval policy.
- [x] Lost-acknowledgement reconciliation without duplicate write.
- [x] Partial and unresolved saga states remain explicit.
- [x] Persisted verified compensation is not replayed.
- [x] Proof, retention, vault, registry, and CLI preserve saga lineage.
- [x] Legacy work objects remain schema-compatible.
- [x] Feature CI and merged-main CI both pass.

## v1.9 acceptance gates

- [ ] Partial saga survives worker/process loss as a durable Work Object.
- [ ] Replacement worker acquires the saga recovery lease after expiry.
- [ ] Verified compensation is never replayed.
- [ ] Pending compensation executes exactly once in the controlled handoff path.
- [ ] Ambiguous compensation acknowledgement reconciles before retry.
- [ ] Stale worker cannot continue after lease ownership moves.
- [ ] Feature CI and merged-main CI pass.

## Remaining platform work

- [ ] Multi-user proof trust policy for signed identities.
- [ ] Broader remote proof/artifact lifecycle surfaces.
- [ ] External browser navigation where permitted.
- [ ] Further worker/control-plane hardening.
- [ ] Studio / wider product surfaces.

## Verification rule

A successful tool response is a receipt, not proof. Work is verified only when independent evidence satisfies the Work Contract success criteria.
