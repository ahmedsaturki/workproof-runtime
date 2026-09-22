# Container Runtime

WorkProof Studio is distributed as a Node 24 container with persistent `/data/work-runs` storage.

The image carries OCI version/revision/source labels. Publication verifies that the release tag and immutable commit tag resolve to the same digest, then runs the published image and checks `/health`.

## Current verified release

- tag: `3.6.0-dev.1`
- immutable digest: `sha256:2c5ba1b58697ec545cf7098d93e8750394b9b1e2ccd9e8f45b647cec689bd247`
- immutable commit tag: `de3ad9fcc10b9db7487c78620607f669249adaa9`
- anonymous GHCR pull: verified
- production Compose image: pinned by tag@digest to the same published image

The production compose file pins the release by digest so tag drift cannot silently change the deployed image. Release/container CI also verifies restart/persistence, TLS/auth topology behavior, backup/restore, rollback, and published digest lineage.

## Rollback

- release: `3.5.0-dev.1`
- immutable commit tag: `cb48780451ed2eddf9211bc5f267b026e2243ca1`
- verified digest: `sha256:ab5b90eb3722b96d714f105536f5c4d6cdc18cebe22992c4fe758fbc88f547d7`
