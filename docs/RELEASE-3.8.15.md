# WorkProof Runtime v3.8.15

## External-write idempotency hardening

v3.8.15 hardens the controlled publication capability so an external-write operation carries a deterministic idempotency key, reconciles existing publication state before writing, and surfaces ambiguous acknowledgement failures instead of silently retrying a blind POST.

### Included changes

- require a validated idempotency key for `pack.publication.local`;
- send the idempotency key through the HTTP `Idempotency-Key` header;
- preflight the target publication by deterministic publication ID before POST;
- treat an existing exact publication as a reconciled successful outcome without another write;
- reject conflicting existing content before any write;
- treat non-404 preflight failures as non-writable rather than guessing absence;
- return an ambiguous receipt when a POST acknowledgement cannot be confirmed;
- add regression coverage for ambiguous acknowledgement, preflight reconciliation, conflicting existing state, missing keys, and header propagation;
- publish the pack manifest and policy metadata.

No change is intended to the WorkProof execution authority, outcome contract, verification, recovery, fencing, or proof model.

### Verification target

The release is valid only after the full repository release/container verification contract succeeds, including Linux and Windows compatibility, browser/filesystem gates, CodeQL, Dependency Review, OSSF Scorecard, source/security checks, benchmark, packed adapters, Compose persistence/resource checks, disposable external topology, five release assets with SHA256 verification, and GHCR digest/lineage verification.

### Rollback

The immediate rollback baseline is the verified v3.8.14 distribution:

- GitHub Release: `v3.8.14`
- release commit: `8fcb6cfca67d865ce56533ad56e1a508d997e98a`
- GHCR digest: `sha256:fcde1ff9748e8c0306160b3d6e61fd03680b1cfb35e51ef305eab4b20640050c`
- commit-addressed image tag: `8fcb6cfca67d865ce56533ad56e1a508d997e98a`

This file is the release note consumed by the immutable release workflow.
