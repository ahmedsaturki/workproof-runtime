# WorkProof Runtime Source Manifest

## Required source tree

The current v2.1 branch contains **119 required paths** enforced by scripts/verify-source-tree.js.

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

## Exact v0.4 local history

- local commit: 8cd9b7d841191b8a030bb462ac8dbd271f8259ca
- tag: v0.4.0-dev
- exact development bundle: workproof-runtime-v0.4.0-dev.bundle

## Verified main milestone evidence

- v1.9 implementation merge: f0173fd9c0603fd1fa58ea6f722486f52a04f932
- v1.9 documentation closeout: a9265bb8ff61db21627bb92a52cbad8aeffe8e50
- v2.0 Studio merge: 0e29eb04addea53ae399887612314bd49ffa341a
- latest main CI #550: success
- v2.0 Studio acceptance: passed
- v2.0 source audit: passed

## Verification discipline

Source-tree completeness, compilation, dependency audit, retention lifecycle, full integration suite, benchmark, demo, CLI, live smoke, and Studio acceptance are separate gates. Passing one does not imply the others passed.
