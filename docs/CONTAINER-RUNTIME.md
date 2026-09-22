# Container Runtime

WorkProof Studio is distributed as a Node 24 container with persistent `/data/work-runs` storage.

## Current stable release

- tag: `3.8.3`
- release commit: `772a5a16b34e94b62bbc6564474736ef2e4da11b`
- GitHub Release ID: `393862783`
- Release workflow #210: success
- Container workflow #207: success
- GHCR image: `ghcr.io/ahmedsaturki/workproof-runtime:3.8.3`
- published digest: `sha256:ec6f891f8e3fc427937f904eb039d95d58387b1d06261cd91c8c9a886bc7cf67`
- immutable image tag: `772a5a16b34e94b62bbc6564474736ef2e4da11b`
- anonymous GHCR pull: verified
- runtime health: verified
- production Compose restart/persistence: verified
- disposable external topology: verified

Production Compose pins the image by tag@digest so tag drift cannot silently change the deployed artifact.

The container sets `WORKPROOF_ALLOW_NON_LOOPBACK=1` so Studio can listen on the container interface while the host publication remains loopback-bound. The direct Studio process remains loopback-only by default.

## Rollback

- release: `3.8.1`
- immutable commit: `f8af30bf69391db22863c432df5c452a73ebaa05`
- verified digest: `sha256:7908cc6a4473495b7b5c51f1a0527815f0a8ff0c6d9eaf20ebf1ddfb0479b5d0`
