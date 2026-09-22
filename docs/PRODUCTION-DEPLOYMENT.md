# Production Deployment Runbook

Supported distribution target: the Node 24 GHCR container.

- image: `ghcr.io/ahmedsaturki/workproof-runtime:3.4.0-dev.7`
- pinned digest: verified by Container CI; final digest is recorded in the post-publication main closeout
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

The repository provides the deployable container and runbook. It does not provision a public hostname, TLS certificate, reverse proxy, production host, or production secrets.


## Public container distribution

The published Container Registry manifest for `3.4.0-dev.5` was verified through the anonymous pull gate; the canonical digest is `sha256:88be340ace01e1d6d48f62af41c806048c41d3f6e3a20741fba29cdc70b8bd4f`.


## Release verification additions

Container CI executes the production Compose profile, checks runtime health and version, reads a persisted Work Object, restarts Compose, and reads the same Work Object again.
