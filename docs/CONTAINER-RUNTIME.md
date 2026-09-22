# Container Runtime

WorkProof Studio is distributed as a Node 24 container with persistent `/data/work-runs` storage.

The image carries OCI version/revision/source labels. Publication verifies that the release tag and immutable commit tag resolve to the same digest, then runs the published image and checks `/health`.

Keep the Studio localhost-bound unless an authenticated reverse proxy is configured.

## Current verified release

- tag: `3.4.0-dev.12`
- immutable digest: `sha256:491261f71ff3b010bb7a967b74b348ca40042d3150e2f6c8a36c1a4dcf7012bb`
- immutable commit tag: `1b174b33da8e519e5a23e7565944aba6266d8e97`
- anonymous GHCR pull: verified
- production Compose image: pinned by tag@digest to the same published image

The production compose file pins the release by digest so tag drift cannot silently change the deployed image. Release/container CI also verifies restart/persistence, TLS/auth topology behavior, backup/restore, rollback, and published digest lineage.
