# Container Runtime

WorkProof Studio is distributed as a Node 24 container with persistent `/data/work-runs` storage.

The image carries OCI version/revision/source labels. Publication verifies that the release tag and immutable commit tag resolve to the same digest, then runs the published image and checks `/health`.

Keep the Studio localhost-bound unless an authenticated reverse proxy is configured.


## Current verified release

- tag: `3.4.0-dev.2`
- immutable digest: `sha256:2df71bf775272b9227979687de0c93d80f08814b83d7eb19e37e14dd63d8740b`
- anonymous GHCR pull: verified

The production compose file pins the release by digest so tag drift cannot silently change the deployed image.
