# Container Runtime

WorkProof Studio is distributed as a Node 24 container with persistent `/data/work-runs` storage.

## Current stable release

- tag: `3.8.5`
- release commit: `bcf951fdf772ae8aa843671e3bf7ae1ba765471b`
- GitHub Release ID: `393990944`
- Release workflow #218: success
- Container workflow #215: success
- GHCR image: `ghcr.io/ahmedsaturki/workproof-runtime:3.8.5`
- published digest: `sha256:0efe2ff7d2a2b97707c32d91523d38a0932e796ea417d38b0d4a1fdb8d1315a5`
- immutable image tag: `bcf951fdf772ae8aa843671e3bf7ae1ba765471b`
- anonymous GHCR pull: verified
- runtime health: verified
- production Compose restart/persistence: verified
- disposable external topology: verified

Production Compose pins the image by tag@digest so tag drift cannot silently change the deployed artifact.

The container sets `WORKPROOF_ALLOW_NON_LOOPBACK=1` so Studio can listen on the container interface while the host publication remains loopback-bound. The direct Studio process remains loopback-only by default. The production Compose also enables an init process, 10s graceful-stop window, 1 CPU cap, 1 GiB memory cap, 512 PID cap, and 10 MiB × 3 JSON log rotation; `scripts/container-compose-smoke.js` verifies these controls.

## Container base provenance

- base: `docker.io/library/node:24.21.0-trixie-slim`
- index digest: `sha256:8ec5d7557396cfe32d21c3f9c13072355ceab22b584578ca4bb28af31120cffe`
- immutable base verification: CI/Release/Container gates passed

## Rollback

- release: `3.8.1`
- immutable commit: `f8af30bf69391db22863c432df5c452a73ebaa05`
- verified digest: `sha256:7908cc6a4473495b7b5c51f1a0527815f0a8ff0c6d9eaf20ebf1ddfb0479b5d0`
