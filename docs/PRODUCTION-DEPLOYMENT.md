# Production Deployment Runbook

Supported distribution target: the Node 24 GHCR container.

- image: `ghcr.io/ahmedsaturki/workproof-runtime:3.4.0-dev.9`
- pinned digest: `sha256:3acde2ee0e82c0d7bf1e9bd8217aa774e1ceb5cdafd64150b87b7581aa0ea04d`
- release commit: `3041aeb49241dc50daae56ba70763bc61aeb29bf`
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

Back up `work-runs` and any configured proof vault. Roll back by pinning the compose image to a previously verified GHCR tag@digest or immutable commit tag, then restart the stack.

The current dev.9 container was independently verified for restart/persistence. A disposable external-topology CI gate additionally exercises backup/restore and rollback to the previous immutable dev.8 image.

## Release integrity

Release automation runs `npm run check`, verifies required release assets, downloads them again, checks SHA256 sums, and re-validates benchmark metrics. Container automation verifies exact release-source lineage, image tag/digest consistency, published health, anonymous pull, and production Compose restart/persistence.

## External-topology validation

The repository includes a disposable smoke that places Studio behind an isolated TLS reverse proxy with authentication. The smoke proves:

- TLS termination.
- Authentication and unauthenticated denial.
- Secret non-leakage into files or Work Object responses.
- Persistent Work Object state through restart.
- Backup creation and restoration.
- Rollback to a previous immutable release image.
- The application port is not exposed directly by the edge topology.

This is a disposable deployment test, not a claim that public DNS, certificates, a public host, or production secrets have been provisioned.

## Boundary

The repository provides the deployable container, local compose, and deployment runbook. Public host/DNS/TLS/reverse-proxy/production-secret provisioning remains an external infrastructure step.
