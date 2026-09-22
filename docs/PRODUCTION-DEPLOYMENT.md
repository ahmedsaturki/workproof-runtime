# Production Deployment Runbook

Supported distribution target: the Node 24 GHCR container.

- image: `ghcr.io/ahmedsaturki/workproof-runtime:3.5.0-dev.1`
- pinned digest: `sha256:ab5b90eb3722b96d714f105536f5c4d6cdc18cebe22992c4fe758fbc88f547d7`
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

The repository provides the deployable container, local compose, and runbook. The authenticated control-plane process is distributed separately and can be connected to Studio through `WORKPROOF_CONTROL_PLANE_URL` when authenticated mutation is required. A disposable CI topology additionally verifies TLS termination, authentication, persistent state, backup/restore, and rollback through an isolated reverse-proxy edge. It does not provision a public hostname, production DNS, public certificate, external host, or production secrets.


## Public container distribution

The published Container Registry manifest for `3.5.0-dev.1` was verified through the anonymous pull gate; the canonical digest is `sha256:ab5b90eb3722b96d714f105536f5c4d6cdc18cebe22992c4fe758fbc88f547d7`.


## Release verification additions

Container CI executes the production Compose profile, checks runtime health and version, reads a persisted Work Object, restarts Compose, and reads the same Work Object again.


## v3.5.0-dev.1 verified release

- release tag: `v3.5.0-dev.1`
- release commit: `cb48780451ed2eddf9211bc5f267b026e2243ca1`
- GitHub Release: `393498803`
- GHCR immutable image tag: `cb48780451ed2eddf9211bc5f267b026e2243ca1`
- GHCR digest: `sha256:ab5b90eb3722b96d714f105536f5c4d6cdc18cebe22992c4fe758fbc88f547d7`
- rollback release: `v3.4.0-dev.12`
- rollback immutable tag: `1b174b33da8e519e5a23e7565944aba6266d8e97`
- rollback digest: `sha256:491261f71ff3b010bb7a967b74b348ca40042d3150e2f6c8a36c1a4dcf7012bb`
