# WorkProof Runtime Status

Date: 2026-09-21

## Current main

v1.0-dev self-hosted proof registry is verified on main.

Current main commit:
265a580b1352a610957e88c0954a02e736ad6886

Verified main CI run #175:
- source audit: 75/75
- automated tests: 55/55
- benchmark/demo/CLI passed
- live GitHub smoke passed

## Active v1.1 gate

Branch: feature/v1.1-registry-auth

Target:
- local hashed bearer credentials
- read/write authorization
- namespace isolation
- auth audit evidence
- CLI credential lifecycle
- bearer-aware registry client
- end-to-end authorization regressions
- focused security regression evidence and dependency audit

## Remaining platform work

- [ ] v1.1 authenticated multi-user registry
- [ ] v1.2 distributed trust-policy synchronization
- [ ] retention/garbage-collection policy
- [ ] generalized compensation/saga engine
- [ ] external browser navigation where permitted
- [ ] distributed/remote workers and control plane
- [ ] Studio / REST / SDK surfaces
- [ ] hosted/managed deployment

## Verification rule

A successful tool response is a receipt, not proof. Work is verified only when independent evidence satisfies the Work Contract success criteria.