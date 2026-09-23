# Container Runtime

WorkProof Studio is distributed as a Node 24 container with persistent `/data/work-runs` storage.

## Current stable release

- tag: `3.8.13`
- GHCR image: `ghcr.io/ahmedsaturki/workproof-runtime:3.8.13`
- published digest: `sha256:c9a9f6f6f0fb111dc64d42b1a2746091f14366c389c1af6eb3b0683c6e3fe564`
- commit-addressed image tag: `dadef28ce8fbd299201a228673f1c2737c5b7d62`

## Container base provenance

- base: `docker.io/library/node:24.21.0-trixie-slim`
- index digest: `sha256:8ec5d7557396cfe32d21c3f9c13072355ceab22b584578ca4bb28af31120cffe`
- immutable base verification: CI/Release/Container gates passed

## Rollback

- release: `3.8.1`
- rollback commit: `f8af30bf69391db22863c432df5c452a73ebaa05`
- verified digest: `sha256:7908cc6a4473495b7b5c51f1a0527815f0a8ff0c6d9eaf20ebf1ddfb0479b5d0`
