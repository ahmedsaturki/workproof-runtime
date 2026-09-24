# Container Runtime

WorkProof Studio is distributed as a Node 24 container with persistent `/data/work-runs` storage.

## Current stable release

- tag: `3.8.15`
- GHCR image: `ghcr.io/ahmedsaturki/workproof-runtime:3.8.15`
- published digest: `sha256:a1e1c61cb98d6c70cc36458e805f99bc2abd32b89c07340332fb419b3e633715`
- commit-addressed image tag: `cc9dbea5d3dd45b7ad542e8b2d417174f8d51365`

## Container base provenance

- base: `docker.io/library/node:24.21.0-trixie-slim`
- index digest: `sha256:8ec5d7557396cfe32d21c3f9c13072355ceab22b584578ca4bb28af31120cffe`
- immutable base verification: CI/Release/Container gates passed

## Rollback

- release: `3.8.1`
- rollback commit: `f8af30bf69391db22863c432df5c452a73ebaa05`
- verified digest: `sha256:7908cc6a4473495b7b5c51f1a0527815f0a8ff0c6d9eaf20ebf1ddfb0479b5d0`
