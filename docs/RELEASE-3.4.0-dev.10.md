# WorkProof Runtime v3.4.0-dev.10

Product-validation prerelease carrying the local-first operator hardening from dev.9 plus representative multi-capability execution and disposable external-topology validation.

## Included

- packaged `workctl` with mission execution and safe resume
- operator guidance and capability-chain visualization in Studio
- representative Research → Transform multi-capability mission
- persistent Work Object and proof semantics
- production Compose restart/persistence validation
- CI/source-tree/release lineage verification
- disposable TLS/auth/backup/restore/rollback topology smoke
- GHCR publication and anonymous pull verification

## Release gates

The release workflow verifies the complete repository check, including the representative multi-capability mission. The container workflow verifies the published runtime image, production Compose restart/persistence, TLS/auth edge, backup/restore, rollback, and deny-by-default edge exposure.

The release is a prerelease. Public DNS, public host provisioning, and production secrets outside the repository remain external infrastructure.
