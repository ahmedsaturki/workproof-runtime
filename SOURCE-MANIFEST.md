# WorkProof Runtime Source Manifest

## Required source tree

The current v2.6 worker-aware Studio branch contains **135 required paths** enforced by scripts/verify-source-tree.js.

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
- execution fencing token and stale-worker execution boundary

## V2.5 additions

- docs/RELEASE-GATE-V2.5.md
- docs/FINAL-AUDIT-V2.5.md
- packages/coordination/src/leases.ts worker liveness/reassignment semantics
- packages/coordination/src/persistent.ts worker liveness/reassignment helpers
- packages/control-plane/src/http.ts read-only worker status endpoint
- test/worker-lifecycle.test.ts

## v2.3 additions

- packages/control-plane/src/idempotency.ts
- test/control-idempotency.test.ts
- docs/RELEASE-GATE-V2.3.md
- docs/RELEASE-GATE-V2.4.md
- docs/FINAL-AUDIT-V2.4.md
- docs/FINAL-AUDIT-V2.3.md

## V2.4 additions

- apps/fenced-worker.ts
- packages/core/src/types.ts ExecutionFence contract
- packages/runtime/src/engine.ts fencing boundary
- packages/recovery/src/engine.ts fence propagation
- test/fencing.test.ts

## v2.7 merged-main verification

- feature head: `9f0932a88ab78621a08f6d73973825d5787da94c`
- feature CI #694: success
- merged commit: `df3bda90e10e17f5e683a153c68d7537e9d4a2c0`
- merged-main CI #695: success
- source-tree audit: 137/137
- dependency security audit: success
- strict build: success
- retention lifecycle: success
- full sequential suite: success
- benchmark/demo/CLI/live GitHub smoke: success

## v2.5 merged-main verification

- feature head: `c36d02cab606256d25df01ea40a36d06c368a448`
- feature CI #660: success
- merged commit: `234e4397ae8e98acf1fcdf5fd57c42188582ae8f`
- merged-main CI #661: success
- source-tree audit: 133/133
- dependency security audit: success
- strict build: success
- retention lifecycle: success
- full sequential suite: success
- benchmark/demo/CLI/live GitHub smoke: success

## v2.6 merged-main verification

- feature head: `bb4b4784b45af90bb9464d51d14c466143881cdb`
- feature CI #677: success
- merged commit: `172757754264398137a2982ca62a5d5449028f04`
- merged-main CI #678: success
- source-tree audit: 135/135
- dependency security audit: success
- strict build: success
- retention lifecycle: success
- full sequential suite: success
- benchmark/demo/CLI/live GitHub smoke: success

## v2.4 merged-main verification

- feature head: `8f11968bb06dfc6b3958aac5435afd0fe5f60569`
- feature CI #652: success
- merged commit: `77603553fff569b230a71de0b92aa3e4a6ae1342`
- merged-main CI #653: success
- source-tree audit: 131/131
- dependency security audit: success
- full sequential suite: success
- benchmark/demo/CLI/live GitHub smoke: success

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
