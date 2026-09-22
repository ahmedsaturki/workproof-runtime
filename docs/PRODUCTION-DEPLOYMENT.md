# Production Deployment Runbook

Supported distribution target: the Node 24 GHCR container.

- image: `ghcr.io/ahmedsaturki/workproof-runtime:3.4.0-dev.10`
- pinned digest: `sha256:3fa81f645ccb0c13e0dbfd5da13c089e982f5ed85a0c79b5ec49e021820315fa`
- bind: `127.0.0.1:8788`
- persistent data: `./work-runs -> /data/work-runs`

## Start

```bash
mkdir -p work-runs
sudo chown -R 10001:10001 work-runs
docker compose -f compose.production.yaml pull
docker compose -f compose.production.yaml up -d
curl -fsS http://127.0.0.1:8788/health
```

## Public exposure

Do not expose port 8788 directly to the Internet. Use a TLS reverse proxy with authentication/authorization before exposing Work Objects or proof information.

## Backup and rollback

Back up `work-runs` and any configured proof vault. Roll back by pinning the compose image to a previously verified GHCR tag@digest or immutable digest and restarting the stack.

## Release integrity

Release automation runs `npm run check`, verifies required release assets, downloads them again, checks SHA256 sums, and re-validates benchmark metrics. Container automation verifies image tag/digest consistency and runs a real `/health` smoke.

## Boundary

The repository provides the deployable container, local compose, and runbook. A disposable CI topology additionally verifies TLS termination, authentication, persistent state, backup/restore, and rollback through an isolated reverse-proxy edge. It does not provision a public hostname, production DNS, public certificate, external host, or production secrets.


## Public container distribution

The published Container Registry manifest for `3.4.0-dev.10` was verified through the anonymous pull gate; the canonical digest is `sha256:3fa81f645ccb0c13e0dbfd5da13c089e982f5ed85a0c79b5ec49e021820315fa`.


## Release verification additions

Container CI executes the production Compose profile, checks runtime health and version, reads a persisted Work Object, restarts Compose, and reads the same Work Object again.
