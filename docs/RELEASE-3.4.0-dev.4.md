# WorkProof Runtime v3.4.0-dev.4

Coherent follow-up prerelease after the verified v3.4 product-readiness work.

## Release intent

This release is built from the current `main` commit and keeps source archive, GitHub Release, GHCR image, and local production compose on one release lineage.

## Included

- Verified local-first Digital Work Operator product baseline.
- Packaged `workctl` CLI with run/resume/inspect/verify/proof lifecycle commands.
- Restart persistence and guarded Work Object resume.
- Studio runtime configuration wiring.
- Atomic collision-safe local Work Object persistence.
- Product-readiness and distribution verification gates.
- Existing M001-M005 benchmark and full integration/security/browser verification.

## Distribution

The release pipeline must verify:

- full `npm run check`
- package installation and real mission execution
- five release assets with SHA256 re-download verification
- benchmark semantic verification
- GHCR publication, runtime health, anonymous pull, and immutable digest consistency

This prerelease does not claim public DNS, TLS, reverse-proxy, external-host, or production-secret provisioning.
