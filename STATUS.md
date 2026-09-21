# WorkProof Runtime Status

Date: 2026-09-21

## Current main

v1.1-dev authenticated multi-user proof registry is merged to main; merged-main CI is the final gate.

Current main commit:
57e26542001ff33ba28c9ae82da370bda74315f7

## Active v1.1 gate

Branch: feature/v1.1-registry-auth

v1.1 adds authenticated multi-user registry transport, namespace isolation, CLI credential lifecycle, and focused security evidence.

## Parallel v1.2 core branch

Branch: feature/v1.2-trust-sync

Target:
- versioned trust-policy snapshots
- canonical digesting
- Ed25519 administrative signatures
- explicit signer authorization
- deterministic reconciliation for newer, equal, conflicting, stale, and rollback states

## Remaining platform work

- [ ] v1.1 authenticated multi-user registry
- [ ] v1.2 registry-to-registry trust synchronization
- [ ] retention/garbage-collection policy
- [ ] generalized compensation/saga engine
- [ ] external browser navigation where permitted
- [ ] distributed/remote workers and control plane
- [ ] Studio / REST / SDK surfaces
- [ ] hosted/managed deployment

## Verification rule

A successful tool response is a receipt, not proof. Work is verified only when independent evidence satisfies the Work Contract success criteria.
