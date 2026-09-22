# Container Runtime

WorkProof Studio is distributed as a Node 24 container with persistent `/data/work-runs` storage.

The image carries OCI version/revision/source labels. Publication verifies that the release tag and immutable commit tag resolve to the same digest, then runs the published image and checks `/health`.

Keep the Studio localhost-bound unless an authenticated reverse proxy is configured.

## Current verified release

- tag: `3.5.0-dev.1`
- immutable digest: `sha256:ab5b90eb3722b96d714f105536f5c4d6cdc18cebe22992c4fe758fbc88f547d7`
- immutable commit tag: `cb48780451ed2eddf9211bc5f267b026e2243ca1`
- anonymous GHCR pull: verified
- production Compose image: pinned by tag@digest to the same published image

The production compose file pins the release by digest so tag drift cannot silently change the deployed image. Release/container CI also verifies restart/persistence, TLS/auth topology behavior, backup/restore, and published digest lineage.
