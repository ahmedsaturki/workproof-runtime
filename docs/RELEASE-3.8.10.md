# WorkProof Runtime v3.8.10

## Corrective distribution release

v3.8.10 is a corrective patch release for the runtime contract.

The immutable `v3.8.10` tag and published source/container assets are anchored to release commit `9daac7a926ce1631ac708a6c234379d622c56c19`. That release snapshot was followed by a post-publication reconciliation on `main` that corrected operator-facing lineage metadata to match the published GitHub Release and GHCR evidence without changing runtime semantics.

The published assets remain immutable historical snapshots of their tag commit; the reconciliation does not rewrite the release tag or its assets.

### Verification requirements

The release is valid only after:

- the release branch is proven to descend from current `main`;
- package and lock versions match the release tag;
- the complete `npm run check` suite succeeds;
- packed CLI, Control Plane, MCP, and A2A smoke tests succeed;
- the container for the same release commit passes runtime, persistence, external-topology, rollback, and anonymous-pull checks;
- five release assets are published and their SHA256 manifest verifies;
- release target/tag/manifest commit lineage verifies;
- the final release state is reconciled back to `main`.

### Governance

GitHub `main` branch protection remains a repository-level external control and is documented separately in `docs/GITHUB-GOVERNANCE.md`.


## Published evidence

- GitHub Release ID: `394046514`
- release commit: `9daac7a926ce1631ac708a6c234379d622c56c19`
- Release workflow: #261 — success
- Container workflow: #258 — success
- GHCR digest: `sha256:cad9c467db8fe82abd1b15d30d90dbf7e87ad6683f44a8c7c8763c327af6a1c8`
- immutable image tag: `9daac7a926ce1631ac708a6c234379d622c56c19`
- five release assets published with SHA256 verification; current `main` carries the subsequent operator-facing lineage reconciliation
