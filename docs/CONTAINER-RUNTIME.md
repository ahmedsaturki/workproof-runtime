# Container Runtime

WorkProof Studio is distributed as a Node 24 container with persistent `/data/work-runs` storage.

The image carries OCI version/revision/source labels. Publication verifies that the release tag and immutable commit tag resolve to the same digest, then runs the published image and checks `/health`.

## Current verified release

- tag: `3.7.0-dev.1`
- immutable digest: `sha256:28e8d9af0ab71442b33df8b72308089f520b5ba23128401c0a05675809ba1748`
- immutable commit tag: `f776ed9f5fcbb055f7da41ca69714c19b20f9aad`
- anonymous GHCR pull: verified
- production Compose image: pinned by tag@digest to the same published image

The production compose file pins the release by digest so tag drift cannot silently change the deployed image. Release/container CI also verifies restart/persistence, TLS/auth topology behavior, backup/restore, rollback, and published digest lineage.

## Rollback

- release: `3.6.0-dev.1`
- immutable commit tag: `de3ad9fcc10b9db7487c78620607f669249adaa9`
- verified digest: `sha256:2c5ba1b58697ec545cf7098d93e8750394b9b1e2ccd9e8f45b647cec689bd247`
