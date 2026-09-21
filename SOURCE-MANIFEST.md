# WorkProof Runtime Source Manifest

## Required source tree

The current v2.3 closeout contains **127 required paths** enforced by scripts/verify-source-tree.js.

The tree includes:
- proof registry and authenticated transport
- signed proof identity and trusted signer policy
- proof-vault retention, reachability, and GC
- persistent cross-process lease authority
- WorkEngine execution-lease binding
- durable worker-loss recovery
- authenticated control plane
- SDK Work Object round-trip
- browser acceptance reliability preflight
- live GitHub integration and external-write safety regression coverage
- durable saga compensation recovery after worker loss
- local read-only Studio
- authenticated Studio control delegation
- read-only proof/audit views backed by the proof vault
- durable control-plane idempotency

## v2.3 additions

- packages/control-plane/src/idempotency.ts
- test/control-idempotency.test.ts
- docs/RELEASE-GATE-V2.3.md
- docs/FINAL-AUDIT-V2.3.md

## Verified main milestone evidence

- v2.1 Studio control merge: afe1e93497b01ce61c767a53f1a75e8e1d37b366
- v2.1 feature CI #568: success
- v2.1 merged-main CI #569: success
- v2.2 proof/audit Studio merge: 5deee742ad0b481ff4e55832b972706e84de3c01
- v2.2 feature CI #582: success
- v2.2 merged-main CI #583: success
- v2.3 merge: 47e09002f135c0d2f999b2465e5bfbd291db4c22
- v2.3 feature CI #619: success
- v2.3 merged-main CI #621: success

## Exact v0.4 local history

- local commit: 8cd9b7d841191b8a030bb462ac8dbd271f8259ca
- tag: v0.4.0-dev
- exact development bundle: workproof-runtime-v0.4.0-dev.bundle

## Verification discipline

Source-tree completeness, compilation, dependency audit, retention lifecycle, full integration suite, benchmark, demo, CLI verification, live smoke, and Studio acceptance/control delegation are separate gates. Passing one does not imply the others passed.
