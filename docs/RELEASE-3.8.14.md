# WorkProof Runtime v3.8.14

## Operational hardening patch

v3.8.14 packages the post-v3.8.13 operational hardening that was verified on `main`. It focuses on correctness under failure and load without changing the WorkProof authority model.

### Included changes

- finalize a claimed Control Plane idempotency record for terminal mutation errors, including 4xx/404 execution failures, so a failed mutation cannot leave its key permanently pending;
- preserve the public terminal error response while making safe replay deterministic and non-duplicating;
- add regression coverage for failed resume replay and terminal ledger state;
- make packed Control Plane, MCP, and A2A startup waits honor `WORKPROOF_TEST_TIMEOUT_MS` with a 30-second default, reducing false failures under parallel load;
- keep the post-release source-drift guard explicit for these narrowly scoped hardening files.

No change is intended to the WorkProof execution authority, outcome contract semantics, risk ceilings, external-effect reconciliation model, proof integrity model, or interoperability boundaries.

### Verification target

The v3.8.14 publication is valid only after the release branch is based on the current `main` and the repository's full verification contract succeeds, including:

- Linux build, full unit/integration suite, benchmark, demo, CLI proof, representative missions, and live GitHub smoke;
- Windows compatibility, Chromium/CDP compatibility, and private filesystem security;
- CodeQL JavaScript/TypeScript and Actions analysis;
- Dependency Review and OSSF Scorecard;
- source-tree, secret, governance, release-state, and container-base verification;
- packed Control Plane/MCP/A2A distribution smokes;
- production Compose persistence/resource smoke;
- disposable external topology verification;
- GitHub Release five-asset SHA256 verification and tag/commit lineage;
- GHCR version and commit-addressed image tags resolving to the same verified digest.

### Rollback

The immediate rollback baseline is the verified v3.8.13 distribution:

- GitHub Release: `v3.8.13`
- release commit: `dadef28ce8fbd299201a228673f1c2737c5b7d62`
- GHCR digest: `sha256:c9a9f6f6f0fb111dc64d42b1a2746091f14366c389c1af6eb3b0683c6e3fe564`
- commit-addressed image tag: `dadef28ce8fbd299201a228673f1c2737c5b7d62`

This file is the release note consumed by the immutable release workflow.
