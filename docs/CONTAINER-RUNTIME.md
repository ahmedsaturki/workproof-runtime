# Container Runtime

WorkProof Studio is distributed as a Node 24 container with persistent `/data/work-runs` storage.

## Current stable release

- tag: `3.8.0`
- release commit: `2b02d22e897d5fe736f93267c72036d951f74082`
- GitHub Release ID: `393558255`
- Release workflow #189: success
- Container workflow #186: success
- GHCR image: `ghcr.io/ahmedsaturki/workproof-runtime:3.8.0`
- published digest: `sha256:f057384da7a5789aa71ffcec0ea4589ec8c10e7a9e1b37f8cabcabd303d38fcc`
- immutable image tag: `2b02d22e897d5fe736f93267c72036d951f74082`
- anonymous GHCR pull: verified
- runtime health: verified
- production Compose restart/persistence: verified
- disposable external topology: verified

Production Compose pins the image by tag@digest so tag drift cannot silently change the deployed artifact.

## Rollback

- release: `3.8.0-dev.1`
- immutable commit: `bba39f385ab042344f4fc2ebe04aeef7ef3c98b9`
- verified digest: `sha256:acafde09bd74d535fb706acde68f7e6279283ac49f6d1863585d672fb691ac02`
