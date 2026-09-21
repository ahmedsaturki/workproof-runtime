# WorkProof Runtime Source Manifest

## Required source tree

The current main v1.9 closeout contains **115 required paths** enforced by scripts/verify-source-tree.js.

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

## Exact v0.4 local history

- local commit: 8cd9b7d841191b8a030bb462ac8dbd271f8259ca
- tag: v0.4.0-dev
- exact development bundle: workproof-runtime-v0.4.0-dev.bundle

## v1.9 additions

- docs/RELEASE-GATE-V1.9.md
- docs/FINAL-AUDIT-V1.9.md
- packages/runtime/src/saga-recovery.ts
- test/saga-recovery.test.ts
- persisted EffectRecord input for compensation reconstruction
- work-object schema support for effect input

## Verified main milestone evidence

- v1.9 merge commit: f0173fd9c0603fd1fa58ea6f722486f52a04f932
- feature CI #528: success
- merged-main CI #530: success
- pre-closeout source audit on main: 114/114
- closeout source audit target: 115/115 after FINAL-AUDIT-V1.9.md is included
- dependency security audit: success
- retention lifecycle suite: success
- sequential full integration verification: 30/30 test files passed
- benchmark: passed
- demo: verified
- CLI proof + mission: verified
- live GitHub smoke: verified

## Verification discipline

Source-tree completeness, compilation, dependency audit, retention lifecycle, full integration suite, benchmark, demo, CLI, and live smoke are separate gates. Passing one does not imply the others passed.
