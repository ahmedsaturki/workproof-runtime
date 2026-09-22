# WorkProof Runtime v3.4.0-dev.11

Product-hardening prerelease cut from the verified main lineage after v3.4.0-dev.10.

## Included

- v3.4.0-dev.10 product-readiness and multi-capability mission baseline.
- Disposable external-topology validation covering TLS, authentication, secret non-leakage, persistence, backup/restore, rollback, and anonymous pull.
- Published-release lineage verification and exact image pinning.
- Zero-dependency tracked-file secret scanning with dedicated false-positive coverage.
- Exact rollback image digest validation.
- Safe local Work Object persistence and packaged workctl operation.

## Distribution boundary

This prerelease remains private to the repository/package ecosystem and is not an npm registry publication. Public DNS, production host provisioning, externally managed secrets, and public reverse-proxy infrastructure remain deployment-time resources.

## Verification

The release and container workflows must pass full repository checks, package/mission smoke, external topology smoke, published lineage verification, release asset re-download verification, container runtime health, anonymous GHCR pull, image provenance, and rollback/persistence checks.
