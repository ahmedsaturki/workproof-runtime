# Release Gate v1.2-dev - Signed Trust-Policy Synchronization

Date: 2026-09-21

## Scope

Make trust policy portable between self-hosted registries through versioned, signed snapshots while keeping transport authorization separate from proof/trust identity.

## Acceptance gates

- [x] Versioned trust-policy snapshot with monotonic epoch.
- [x] Canonical snapshot digest.
- [x] Ed25519 signature over the canonical snapshot envelope.
- [x] Explicit trusted administrative key allowlist.
- [x] Namespace-scoped administrative signer allowlist when authenticated namespaces are used.
- [x] Reject invalid digest or signature.
- [x] Reject unknown signer identities.
- [x] Deterministic noop for identical epoch/digest.
- [x] Deterministic conflict for different snapshots at the same epoch.
- [x] Rollback state is explicit and requires an override.
- [x] Pure reconciliation/apply functions are independently testable.
- [x] Authenticated trust snapshot publish/pull/list transport.
- [x] Explicit apply endpoint with monotonic epoch enforcement.
- [x] Revocation state propagates through signed snapshots.
- [x] Same-epoch conflict is rejected.
- [x] Forged/untrusted signer is rejected.
- [x] Explicit rollback requires an override.
- [x] Dedicated v1.2 security evidence covers trust transport authorization separation.
- [ ] Registry-to-registry transport.
- [ ] Signed snapshot replication API.
- [ ] Revocation propagation protocol.
- [ ] Persistent rollback/audit history.
- [ ] Distributed consensus or hosted identity federation.

## Security boundary

A snapshot signature authenticates the snapshot under the signing key. Acceptance still requires an explicitly trusted administrative identity. Registry bearer credentials authorize transport calls but do not grant trust-policy authority. In a multi-namespace server, administrative signer trust is namespace-scoped when configured.

The v1.2 core does not claim distributed consensus.

## Milestone result

The v1.2-dev trust synchronization milestone is complete only after feature CI and merged-main CI both pass.
