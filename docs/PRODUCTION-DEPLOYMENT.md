# Production Deployment Runbook

Supported distribution target: the Node 24 GHCR container.

- image: `ghcr.io/ahmedsaturki/workproof-runtime:3.4.0-dev.4`
- pinned digest: `sha256:1500730c2c2c9dc0d6da24ca2dd1de4948699e4f2956768d39107b91d753efba`
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

The published Container Registry manifest for `3.4.0-dev.4` will be verified through the anonymous pull gate and its canonical digest recorded here after publication.
