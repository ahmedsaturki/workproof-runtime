# Container Runtime

WorkProof Studio is distributed as a Node 24 container with persistent `/data/work-runs` storage.

The image carries OCI version/revision/source labels. Publication verifies that the release tag and immutable commit tag resolve to the same digest, then runs the published image and checks `/health`.

Keep the Studio localhost-bound unless an authenticated reverse proxy is configured.


## Current verified release

- tag: `3.4.0-dev.2`
- immutable digest: `sha256:490dcb17e37c0f9a9cdbf7f30624d7d393f9fdb59b911cc9e86b9de681195617`

The production compose file pins the release by digest so a later tag mutation cannot silently change the deployed image.
