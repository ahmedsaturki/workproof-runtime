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

## Active v1.0 gate

Current branch:
feature/v1.0-proof-registry

Target:
- HTTP registry protocol over the existing content-addressed vault.
- Verified client publish/get/list transport.
- Idempotent remote publication.
- Integrity enforcement at registry ingress and egress.
- Local/self-hosted operation with no managed service dependency.
- End-to-end local HTTP tests.

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
