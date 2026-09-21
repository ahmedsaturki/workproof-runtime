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
- [x] Client-side snapshot digest/signature validation after transport.
- [x] Explicit apply endpoint with monotonic epoch enforcement.
- [x] Revocation state propagates through signed snapshots.
- [x] Same-epoch conflict is rejected.
- [x] Forged/untrusted signer is rejected.
- [x] Explicit rollback requires an override.
- [x] Absolute filesystem paths are not exposed in trust snapshot records.
- [x] Registry-to-registry signed snapshot transport is exercised by two independent self-hosted registries.
- [x] Signed snapshot replication API surface is provided by publish/pull/apply client operations.
- [x] Persistent trust snapshot index and audit event history records accept/apply/noop/rollback transitions.
- [x] Dedicated v1.2 security evidence covers trust transport authorization separation.
- [ ] Distributed consensus or hosted identity federation.

## Security boundary

A snapshot signature authenticates the snapshot under the signing key. Acceptance still requires an explicitly trusted administrative identity. Registry bearer credentials authorize transport calls but do not grant trust-policy authority. In a multi-namespace server, administrative signer trust is namespace-scoped when configured.

The v1.2 core does not claim distributed consensus.

## Milestone result

The v1.2 signed trust-policy synchronization scope is verified on main by feature and merged-main CI. Distributed consensus and hosted federation remain outside this milestone.
