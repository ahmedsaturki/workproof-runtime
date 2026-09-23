# WorkProof Runtime v3.8.12

## Published security hardening release

v3.8.12 is the published security hardening release following v3.8.11. It carries verified protection for HTTP-to-file data-flow boundaries, safe transport serialization, browser Runtime.evaluate escaping, release-lineage API boundaries, external-topology image selection, and repository-hygiene regressions.

### Included hardening

- stable public error responses for A2A, Studio, and Control Plane while retaining detailed private audit information;
- validated trust-snapshot serialization before local persistence and registry transport;
- browser Runtime.evaluate string escaping for delimiter-sensitive values;
- validated and atomic web-discovery artifact materialization;
- constrained registry proof/trust transport payloads;
- fixed repository/tag endpoints for release-lineage verification;
- constrained release-image selection to the official WorkProof GHCR repository and package version;
- regression coverage for affected trust boundaries, malformed network data, and repository hygiene;
- scoped CodeQL data-flow exclusions limited to the two reviewed artifact sink modules, with surrounding application flow and regression tests retained in the security corpus.

### Published verification evidence

- release tag: `v3.8.12`
- release commit: `19b1efbfbc5f6f2d14eae5538f339667bd9fbb92`
- GitHub Release ID: `394761988`
- Release workflow: #284 — success
- Container workflow: #281 — success
- GHCR image: `ghcr.io/ahmedsaturki/workproof-runtime:3.8.12`
- GHCR digest: `sha256:5690c65d0425c743c4fa0ebc1a31f913497eb6b7d4e8fa11a129a833aa926d5d`
- commit-addressed image tag: `19b1efbfbc5f6f2d14eae5538f339667bd9fbb92`
- Node 24.21.0 Trixie slim base index digest: `sha256:8ec5d7557396cfe32d21c3f9c13072355ceab22b584578ca4bb28af31120cffe`

### Release asset verification

The published release contains exactly five assets:

- `operational-reality-core-3.8.12.tgz` — `sha256:6a5cf16ca9d0a7ddf5a4a16c3d5c083d577eda3d2487017bd09014d923cd1e21`
- `workproof-runtime-v3.8.12.tar.gz` — `sha256:e1b7c1f614242d6c9c2e4faf958d68f9daf6813e1623bc2eb63090bc312c0292`
- `workproof-benchmark-v3.8.12.json` — `sha256:f3704f0ba0d9625b7844579f6d4f684bc2772f967904639571780be8f3ef8a9c`
- `RELEASE-MANIFEST.txt` — `sha256:094986d852bfc0102bfb550111bd285e254503479eb973e837ff498dc927b8f3`
- `SHA256SUMS.txt` — `sha256:41916eaba29b84b792d000f16f1482ee8cb4d553d8925131ae7a066b55945a5a`

Release workflow #284 verified the published assets with `sha256sum -c SHA256SUMS.txt`, verified tag/commit lineage, and validated benchmark semantics.

Container workflow #281 verified the exact release commit, immutable container base, runtime health, production Compose persistence/restart behavior, disposable external topology, anonymous GHCR pull, version/revision provenance labels, and equality of the version and commit-addressed image digests.

### Rollback

The verified rollback baseline remains `v3.8.1` with commit-addressed tag `f8af30bf69391db22863c432df5c452a73ebaa05` and digest `sha256:7908cc6a4473495b7b5c51f1a0527815f0a8ff0c6d9eaf20ebf1ddfb0479b5d0`.

GitHub currently reports `v3.8.12` as non-immutable. The release workflow and digest-pinned container reference provide publication-time integrity evidence; GitHub release/tag immutability remains a separate repository governance control.
