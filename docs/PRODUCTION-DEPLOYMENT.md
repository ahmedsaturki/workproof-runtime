# Production Deployment Runbook

Supported distribution target: the Node 24 GHCR container.

- image: `ghcr.io/ahmedsaturki/workproof-runtime:3.8.5`
- pinned digest: `sha256:0efe2ff7d2a2b97707c32d91523d38a0932e796ea417d38b0d4a1fdb8d1315a5`
- immutable image tag: `bcf951fdf772ae8aa843671e3bf7ae1ba765471b`
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

The default bind is loopback. Non-loopback binding is refused unless an explicit auth policy is configured. Studio is also loopback-bound by default. The packaged container sets `WORKPROOF_ALLOW_NON_LOOPBACK=1` inside the container only so Studio can listen on the container interface while the host publication remains `127.0.0.1:8788`. Do not use this opt-in for a direct host process unless the process is intentionally placed behind an authenticated TLS edge. Mutations use durable idempotency keys when the control-plane ledger is enabled.

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

## Verified v3.8.5 stable release

- GitHub Release: `v3.8.5`
- release commit: `bcf951fdf772ae8aa843671e3bf7ae1ba765471b`
- GHCR image: `ghcr.io/ahmedsaturki/workproof-runtime:3.8.5`
- GHCR digest: `sha256:0efe2ff7d2a2b97707c32d91523d38a0932e796ea417d38b0d4a1fdb8d1315a5`
- immutable image tag: `bcf951fdf772ae8aa843671e3bf7ae1ba765471b`
- GitHub Release ID: `393990944`
- Release workflow: #218
- Container workflow: #215
- rollback release: `3.8.1`
- rollback immutable tag: `f8af30bf69391db22863c432df5c452a73ebaa05`
- rollback digest: `sha256:7908cc6a4473495b7b5c51f1a0527815f0a8ff0c6d9eaf20ebf1ddfb0479b5d0`

The disposable external topology gate verifies TLS termination, authentication, secret non-leakage, persistence, backup/restore, rollback, and deny-by-default network exposure. The repository does not claim a public host, public DNS, public certificate, external production secrets, or third-party hosted control plane are provisioned.
