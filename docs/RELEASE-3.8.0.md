# WorkProof Runtime v3.8.0

Stable release of the operator diagnostics line.

## Included

- Explicit Control Plane readiness endpoint.
- Import-safe Control Plane initialization.
- Machine-readable `workctl doctor`.
- Packaged doctor verification from outside the package working directory.
- Existing WorkProof runtime, proof, recovery, idempotency, Studio, MCP, and A2A surfaces from v3.8.0-dev.1.

## Stability basis

The stable release is a version promotion of the same code path verified by:
- Feature CI #1234.
- Release workflow #180.
- Container workflow #177.
- Main CI #1236 and final documentation closeout #1241.

The stable release is rebuilt and revalidated under its own version, release tag, container image, digest, and main promotion gates before being called released.

## Distribution

- GitHub Release: `v3.8.0`
- GHCR image: `ghcr.io/ahmedsaturki/workproof-runtime:3.8.0`
- npm package publication remains disabled; GitHub Release and GHCR/source distribution are the supported channels.

## Safety boundary

The diagnostics surface is observational only. It never executes work, mutates authoritative Work Objects, declares verification, or replaces independent proof.
