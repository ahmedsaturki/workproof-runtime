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

- v1.9 documentation closeout merge commit: a9265bb8ff61db21627bb92a52cbad8aeffe8e50
- feature CI #528: success
- implementation merged-main CI #530: success
- final closeout CI #532 attempt 2: success
- final source audit: 115/115
- dependency security audit: success
- retention lifecycle suite: success
- sequential full integration verification: 30/30 test files passed
- benchmark: passed
- demo: verified
- CLI proof + mission: verified
- live GitHub smoke: verified

## Verification discipline

Source-tree completeness, compilation, dependency audit, retention lifecycle, full integration suite, benchmark, demo, CLI, and live smoke are separate gates. Passing one does not imply the others passed.
