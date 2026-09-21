# WorkProof Runtime Status

Date: 2026-09-21

## Current main

v0.9-dev content-addressed proof vault is verified on main.

Current main commit:
1b025eb8da677fb6e4ac84875103f5f76dc1a137

Latest main CI:
- run #140: success
- source audit: 71/71 required paths verified
- automated tests: 49/49 passed
- benchmark: passed
- demo: verified
- CLI proof verification + mission execution: verified
- live GitHub repository smoke: passed

## Verified v0.7 gates

- [x] v0.6 user-facing proof integrity CLI.
- [x] Ed25519 key generation.
- [x] CLI proof signing.
- [x] Embedded public key and deterministic key identity.
- [x] Independent signature verification.
- [x] Signature tamper detection.
- [x] Proof-integrity tamper detection.
- [x] Unsigned/legacy compatibility.
- [x] Key overwrite protection.
- [x] Feature branch CI.
- [x] Merged-main CI.
- [x] Final deterministic regression repair verified by main CI.

## Verified v0.8 trust policy

- [x] Local JSON trust policy.
- [x] Trusted and revoked identity states.
- [x] Unknown/mismatched identity handling.
- [x] Ed25519-only trust enrollment.
- [x] CLI trust-add / trust-revoke.
- [x] Optional --require-trusted verification.
- [x] Feature CI final gate.
- [x] Merged-main CI final gate.

## Verified v0.9 proof vault

- [x] Content-addressed proof storage by SHA-256 digest.
- [x] Atomic proof/index writes.
- [x] Local artifact retention by SHA-256 content digest.
- [x] Idempotent duplicate publication.
- [x] Integrity validation before publication and restore.
- [x] Corrupt retained proof/artifact rejection.
- [x] Vault path confinement.
- [x] Artifact reference binding validation.
- [x] CLI publish/list/inspect/restore lifecycle.
- [x] Feature-vault implementation merged to main.
- [x] Merged-main CI run #140: 49/49 tests and all integration gates passed.
- [x] v0.9 issue closed as completed.

## Active next gate

v1.0 self-hosted proof registry / replication.

Current branch:
feature/v1.0-proof-registry

Target:
- HTTP registry protocol over the existing content-addressed vault.
- Proof publication and retrieval by digest.
- Idempotent remote publication.
- Integrity enforcement at registry ingress and egress.
- Local/self-hosted operation with no managed service dependency.
- CLI/server entry point and end-to-end local HTTP tests.

## Remaining platform work

- [ ] v1.0 registry/replication.
- [ ] Authenticated multi-user access.
- [ ] Distributed trust synchronization.
- [ ] Generalized compensation/saga engine.
- [ ] External browser navigation where permitted.
- [ ] Distributed/remote workers and control plane.
- [ ] Studio / REST / SDK surfaces.
- [ ] Retention garbage collection / policy automation.

## Verification rule

A successful tool response is a receipt, not proof. Work is verified only when independent evidence satisfies the Work Contract success criteria.
