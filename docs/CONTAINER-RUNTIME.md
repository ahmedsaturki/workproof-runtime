# Container Runtime

WorkProof Studio is distributed as a Node 24 container with persistent `/data/work-runs` storage.

## Current stable release

- tag: `3.8.1`
- release commit: `f8af30bf69391db22863c432df5c452a73ebaa05`
- GitHub Release ID: `393805901`
- Release workflow #192: success
- Container workflow #189: success
- GHCR image: `ghcr.io/ahmedsaturki/workproof-runtime:3.8.1`
- published digest: `sha256:7908cc6a4473495b7b5c51f1a0527815f0a8ff0c6d9eaf20ebf1ddfb0479b5d0`
- immutable image tag: `f8af30bf69391db22863c432df5c452a73ebaa05`
- anonymous GHCR pull: verified
- runtime health: verified
- production Compose restart/persistence: verified
- disposable external topology: verified

Production Compose pins the image by tag@digest so tag drift cannot silently change the deployed artifact.

## Rollback

- release: `3.8.0`
- immutable commit: `2b02d22e897d5fe736f93267c72036d951f74082`
- verified digest: `sha256:f057384da7a5789aa71ffcec0ea4589ec8c10e7a9e1b37f8cabcabd303d38fcc`
