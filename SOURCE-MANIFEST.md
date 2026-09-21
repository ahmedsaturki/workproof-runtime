# WorkProof Runtime Source Manifest

## Required source tree

The active main v1.8 branch contains 111 required paths enforced by scripts/verify-source-tree.js.

The current tree includes:
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

## Exact v0.4 local history

- local commit: 8cd9b7d841191b8a030bb462ac8dbd271f8259ca
- tag: v0.4.0-dev
- exact development bundle: workproof-runtime-v0.4.0-dev.bundle

## Verified main milestones

- v1.1 implementation verification commit: 7eeefa13afa56acb9db5038ec3b5885f0724e46f
- v1.2 merge commit: b6ef830d79dc432314a4da0f6e143ddb3a8b6f61
- v1.3 retention merge commit: db5c8fa296f13828ccc461c60916457b87af7168
- browser reliability merge commit: 6c01f201f6cec32ab6fa34a01fe878d3f47c5b0b
- v1.4 worker-ownership merge commit: 8dfbce5609e2eba967971cc2dd4ea464b0604504
- v1.5 execution-lease merge commit: b09fbf40489944b09dbcb33dda73ba0fcb57fb04
- v1.6 worker-loss recovery merge commit: b7a1bacd0d47baab7d759bb572351434ac5fdb60
- v1.7 control-plane/SDK merge commit: 86f8effb0e6178eb2f69d7b33472c7579be54d0f

## v1.8 additions

- docs/RELEASE-GATE-V1.8.md
- packages/compensation/src/engine.ts
- test/compensation.test.ts
- saga lineage preserved across proof/retention/registry/CLI integrity reconstruction

## v1.9 additions

- docs/RELEASE-GATE-V1.9.md
- packages/compensation/src/recovery.ts
- test/saga-recovery.test.ts

## v1.9 verification target

- Persisted partial saga recovery after worker loss.
- Replacement-worker saga lease acquisition.
- Verified compensation skip-on-resume.
- Ambiguous compensation reconciliation before retry.
- Stale-worker ownership rejection.

## Current verification evidence

- merged-main CI #476: success
- source audit: 111/111
- v1.8 feature CI #475: success
- dependency security audit: success
- retention lifecycle suite: passed
- full unit/integration suite: passed
- benchmark: passed
- demo: verified
- CLI proof + mission: verified
- live GitHub smoke: verified

## Verification discipline

Source-tree completeness, compilation, dependency audit, retention lifecycle, full integration suite, benchmark, demo, CLI, and live smoke are separate gates. Passing one does not imply the others passed.