# Production Deployment Runbook

Supported distribution target: the Node 24 GHCR container.

- image: `ghcr.io/ahmedsaturki/workproof-runtime:3.8.0`
- pinned digest: `sha256:f057384da7a5789aa71ffcec0ea4589ec8c10e7a9e1b37f8cabcabd303d38fcc`
- immutable image tag: `2b02d22e897d5fe736f93267c72036d951f74082`
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

## Control plane

For authenticated mutation/control APIs, run the separate Control Plane and point Studio at it:

```bash
WORKPROOF_CONTROL_PLANE_PORT=8789 node dist/apps/control-plane.js
```

The default bind is loopback. Non-loopback binding is refused unless an explicit auth policy is configured. Mutations use durable idempotency keys when the control-plane ledger is enabled.

## MCP adapter

For AI hosts that support stdio MCP, run the optional adapter:

```bash
WORKPROOF_MCP_CONTROL_PLANE_URL=http://127.0.0.1:8789 \
WORKPROOF_MCP_TOKEN=<control-plane-token> \
node dist/apps/mcp-server.js
```

MCP is an interoperability layer only; authorization, execution, verification, reconciliation, recovery, and proof remain in WorkProof.

## Public exposure

Do not expose port 8788 directly to the Internet. Use a TLS reverse proxy with authentication/authorization before exposing Work Objects or proof information.

## Backup and rollback

Back up `work-runs` and any configured proof vault. Roll back by pinning Compose to a previously verified immutable GHCR tag@digest and restarting the stack.

## Verified v3.8.0 stable release

- GitHub Release: `v3.8.0`
- release commit: `2b02d22e897d5fe736f93267c72036d951f74082`
- GHCR image: `ghcr.io/ahmedsaturki/workproof-runtime:3.8.0`
- GHCR digest: `sha256:f057384da7a5789aa71ffcec0ea4589ec8c10e7a9e1b37f8cabcabd303d38fcc`
- immutable image tag: `2b02d22e897d5fe736f93267c72036d951f74082`
- rollback release: `3.8.0-dev.1`
- rollback immutable tag: `bba39f385ab042344f4fc2ebe04aeef7ef3c98b9`
- rollback digest: `sha256:acafde09bd74d535fb706acde68f7e6279283ac49f6d1863585d672fb691ac02`

The disposable external topology gate verifies TLS termination, authentication, secret non-leakage, persistence, backup/restore, rollback, and deny-by-default network exposure. The repository does not claim a public host, public DNS, public certificate, external production secrets, or third-party hosted control plane are provisioned.
