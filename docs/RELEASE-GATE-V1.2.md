# Release Gate v1.2-dev - Signed Trust-Policy Synchronization

Date: 2026-09-21

## Scope

Make trust policy portable between self-hosted registries through versioned, signed snapshots while keeping transport authorization separate from proof/trust identity.

## Acceptance gates

- [x] Versioned trust-policy snapshot with monotonic epoch.
- [x] Canonical snapshot digest.
- [x] Ed25519 signature over the canonical snapshot envelope.
- [x] Explicit trusted administrative key allowlist.
- [x] Reject invalid digest or signature.
- [x] Reject unknown signer identities.
- [x] Deterministic noop for identical epoch/digest.
- [x] Deterministic conflict for different snapshots at the same epoch.
- [x] Stale/rollback state is explicit and requires an override.
- [x] Pure reconciliation/apply functions are independently testable.
- [ ] Registry-to-registry transport.
- [ ] Signed snapshot replication API.
- [ ] Revocation propagation protocol.
- [ ] Persistent rollback/audit history.
- [ ] Distributed consensus or hosted identity federation.

## Security boundary

A snapshot signature authenticates the snapshot under the signing key. Acceptance still requires an explicitly trusted administrative identity. Registry bearer credentials authorize transport calls but do not grant trust-policy authority.

The v1.2 core is transport-independent and does not claim distributed consensus.

## Milestone result

The v1.2-dev trust synchronization milestone is complete only after feature CI and merged-main CI both pass.
