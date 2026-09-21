# WorkProof Runtime

Outcome-first digital work runtime: execute real work, reconcile external effects, verify outcomes, and preserve proof.

Status: v0.4.0-dev verified development baseline.

## Core loop

Goal -> Outcome Contract -> Capability -> Execute -> Observe/Reconcile -> Verify -> Recover/Substitute -> Deliver -> Proof.

## Current verification baseline

22 automated tests passed in the verified workspace, with coverage including ambiguous external effects, no-duplicate retry, publication reconciliation, capability substitution, risk/approval enforcement, persistence, discovery, and controlled browser acceptance.

The complete verified source checkpoint is preserved as an artifact and mapped to local commit 8cd9b7d841191b8a030bb462ac8dbd271f8259ca.


## Remote checkpoint

Remote baseline is tracked on `main`. Remote sync status and remaining source-sync work are tracked in [Issue #1](./issues/1).

Local verified source commit: `8cd9b7d841191b8a030bb462ac8dbd271f8259ca`.

The complete local verified source bundle remains available from the engineering workspace while the remaining files are transferred to the remote repository in verified batches.
