# WorkProof Runtime Source Manifest

## Required source tree

The active main v1.5 branch contains **101 required paths** enforced by scripts/verify-source-tree.js.

The current tree includes:
- persistent cross-process lease authority
- WorkEngine execution-lease binding
- worker registration/heartbeat/offline state
- proof registry, trust policy, signed proofs, and retention lifecycle
- browser acceptance reliability preflight
- live GitHub read/write safety regression coverage

## Exact v0.4 local history

- local commit: 8cd9b7d841191b8a030bb462ac8dbd271f8259ca
- tag: v0.4.0-dev
- exact development bundle: workproof-runtime-v0.4.0-dev.bundle

## Verified main history

- v1.1 implementation verification commit: 7eeefa13afa56acb9db5038ec3b5885f0724e46f
- v1.2 merge commit: b6ef830d79dc432314a4da0f6e143ddb3a8b6f61
- v1.3 retention merge commit: db5c8fa296f13828ccc461c60916457b87af7168
- browser reliability merge commit: 6c01f201f6cec32ab6fa34a01fe878d3f47c5b0b
- v1.4 worker-ownership merge commit: 8dfbce5609e2eba967971cc2dd4ea464b0604504
- v1.5 execution-lease merge commit: b09fbf40489944b09dbcb33dda73ba0fcb57fb04

## Current verification evidence

- merged-main CI run #410: success
- source audit: 101/101
- dependency security audit: success
- retention lifecycle suite: passed
- full unit/integration suite: passed
- benchmark: passed
- demo: verified
- CLI proof + mission: verified
- live GitHub smoke: verified

## Verification discipline

Path completeness, compilation, tests, benchmark, live smoke, browser environment readiness, retention behavior, and acceptance behavior are separate gates. Passing one does not imply the others passed.
