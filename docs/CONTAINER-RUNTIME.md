# Container Runtime

WorkProof Studio can run as a Node 24 container with a persistent `/data` volume.

## Image

`ghcr.io/<owner>/workproof-runtime:<release-tag>`

The release container workflow builds the image from the release branch, pushes a version tag plus immutable commit SHA tag, then starts the pushed image and verifies `GET /health`.

## Runtime

Default listener: `0.0.0.0:8788`.

Persistent Work Objects live under `/data/work-runs`.

The Studio is read-only unless an authenticated control-plane URL is explicitly configured by application startup. Do not expose a read-only Studio containing sensitive proof data to an untrusted public network.

## Local run

```bash
docker run --rm -p 8788:8788 -v "$PWD/work-runs:/data/work-runs" ghcr.io/<owner>/workproof-runtime:<release-tag>
```

Then verify:

```bash
curl http://127.0.0.1:8788/health
```

The container image is an operator distribution target. It is not a claim that WorkProof has a public production deployment or managed hosting.


Release verification includes a real container start and `/health` smoke test before the image is considered distributed.
