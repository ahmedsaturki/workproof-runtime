# WorkProof Runtime v3.8.10

## Corrective distribution release

v3.8.10 is a corrective patch release built from the fully reconciled `main` lineage.

The v3.8.9 publication completed its release and container verification gates successfully, but the published v3.8.9 source snapshot retained pre-reconciliation distribution metadata in several operator-facing files. The subsequent main reconciliation corrected those records without changing the runtime contract.

v3.8.10 exists to establish a new immutable release boundary from that reconciled source of truth.

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
