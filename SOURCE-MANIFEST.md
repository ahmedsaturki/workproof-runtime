# WorkProof Runtime Source Manifest

## Required source tree

The current main v2.0 closeout contains **118 required paths** enforced by scripts/verify-source-tree.js.

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

## Exact v0.4 local history

- local commit: 8cd9b7d841191b8a030bb462ac8dbd271f8259ca
- tag: v0.4.0-dev
- exact development bundle: workproof-runtime-v0.4.0-dev.bundle

## v2.0 additions

- apps/studio.ts
- docs/RELEASE-GATE-V2.0.md
- docs/FINAL-AUDIT-V2.0.md
- test/studio.test.ts

## Verified main milestone evidence

- v1.9 implementation merge: f0173fd9c0603fd1fa58ea6f722486f52a04f932
- v1.9 documentation closeout: a9265bb8ff61db21627bb92a52cbad8aeffe8e50
- final v1.9 closeout CI #532 attempt 2: success
- final v1.9 source audit: 115/115
- final v1.9 dependency security audit: success
- final v1.9 retention lifecycle suite: success
- final v1.9 sequential integration suite: 30/30 test files
- final v1.9 benchmark/demo/CLI/live smoke: passed

## Verification discipline

Source-tree completeness, compilation, dependency audit, retention lifecycle, full integration suite, benchmark, demo, CLI, live smoke, and Studio acceptance are separate gates. Passing one does not imply the others passed.

## Verified v2.0 main evidence

- v2.0 Studio merge: 0e29eb04addea53ae399887612314bd49ffa341a
- feature CI #547: success
- merged-main CI #548: success
- Studio acceptance: passed
- source audit: passed
