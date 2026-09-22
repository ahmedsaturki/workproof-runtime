# Production Deployment Runbook

Supported distribution target: the Node 24 GHCR container.

- image: `ghcr.io/ahmedsaturki/workproof-runtime:3.7.0-dev.1`
- pinned digest: `sha256:28e8d9af0ab71442b33df8b72308089f520b5ba23128401c0a05675809ba1748`
- immutable image tag: `f776ed9f5fcbb055f7da41ca69714c19b20f9aad`
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

## Verified v3.7.0-dev.1 release

- GitHub Release: `v3.7.0-dev.1`
- release commit: `f776ed9f5fcbb055f7da41ca69714c19b20f9aad`
- GHCR digest: `sha256:28e8d9af0ab71442b33df8b72308089f520b5ba23128401c0a05675809ba1748`
- rollback release: `3.6.0-dev.1`
- rollback immutable tag: `de3ad9fcc10b9db7487c78620607f669249adaa9`
- rollback digest: `sha256:2c5ba1b58697ec545cf7098d93e8750394b9b1e2ccd9e8f45b647cec689bd247`

The disposable external topology gate verifies TLS termination, authentication, secret non-leakage, persistence, backup/restore, rollback, and deny-by-default network exposure. The repository does not claim a public host, public DNS, public certificate, external production secrets, or third-party hosted control plane are provisioned.
