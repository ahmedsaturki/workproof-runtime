# Container Runtime

WorkProof Studio is distributed as a Node 24 container with persistent `/data/work-runs` storage.

## Current verified release

- tag: `3.8.0-dev.1`
- immutable release commit: `bba39f385ab042344f4fc2ebe04aeef7ef3c98b9`
- published digest: `sha256:acafde09bd74d535fb706acde68f7e6279283ac49f6d1863585d672fb691ac02`
- GitHub Release: `393551082`
- Release workflow #180: success
- Container workflow #177: success
- anonymous GHCR pull: verified
- runtime health: verified
- production Compose restart/persistence: verified
- disposable external topology: verified

The production compose file pins the release by tag@digest so tag drift cannot silently change the deployed image.

## Rollback

- release: `3.7.0-dev.1`
- immutable commit: `f776ed9f5fcbb055f7da41ca69714c19b20f9aad`
- verified digest: `sha256:28e8d9af0ab71442b33df8b72308089f520b5ba23128401c0a05675809ba1748`
