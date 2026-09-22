# Container Runtime

WorkProof Studio is distributed as a Node 24 container with persistent `/data/work-runs` storage.

## Current stable release

- tag: `3.8.8`
- release commit: `54570624e0a3c2c35605cf3e17b7a48c6c5758c6`
- GitHub Release ID: `394031450`
- Release workflow #245: success
- Container workflow #242: success
- GHCR image: `ghcr.io/ahmedsaturki/workproof-runtime:3.8.9`
- published digest: `sha256:ccde8ada2227b016968328f9eec1849e7424d12c2acc89081c30ca191bb6df66`
- immutable image tag: `9f5c04505d0396312eb1b44fa08d5e2f8dd1aebd`
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
