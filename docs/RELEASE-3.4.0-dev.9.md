# WorkProof Runtime v3.4.0-dev.9

Coherent distribution convergence release for the verified local-first product.

## Included

- verified v3.4 benchmark and recovery/proof runtime
- packaged `workctl`
- restart/resume and persisted idempotency drift safety
- portable proof export/verification/import
- explicit proof compatibility
- Studio operator guidance and effect summaries
- production Compose restart/persistence smoke
- exact release-commit Docker build context
- package distribution of operator docs and examples

## Verification

Release CI must verify the complete repository check, package/mission smoke, five release assets with SHA256 re-download validation, and benchmark semantics.

Container CI must verify exact release-source lineage, runtime health, anonymous pull, OCI provenance, digest consistency, and production Compose restart/persistence.

This is a prerelease and does not claim externally provisioned public DNS/TLS/reverse-proxy/host/secrets.
