# Container Runtime

WorkProof Studio is distributed as a Node 24 container with persistent `/data/work-runs` storage.

The image carries OCI version/revision/source labels. Publication verifies that the release tag and immutable commit tag resolve to the same digest, then runs the published image and checks `/health`.

Keep the Studio localhost-bound unless an authenticated reverse proxy is configured.
