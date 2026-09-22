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

The stable release is rebuilt and revalidated under its own version, release tag, container image, digest, publication state, and main promotion gates before being called released.

## Distribution

- GitHub Release: `v3.8.0`
- GHCR image: `ghcr.io/ahmedsaturki/workproof-runtime:3.8.0`
- npm package publication remains disabled; GitHub Release and GHCR/source distribution are the supported channels.

## Safety boundary

The diagnostics surface is observational only. It never executes work, mutates authoritative Work Objects, declares verification, or replaces independent proof.


## Stable publication verification

- GitHub Release: `v3.8.0` / ID `393558255`
- release commit: `2b02d22e897d5fe736f93267c72036d951f74082`
- Initial Release workflow #189: success
- Stable release-state reconciliation workflow #190: success
- Initial Container workflow #186: success
- Final Container workflow #187: success
- GHCR digest: `sha256:f057384da7a5789aa71ffcec0ea4589ec8c10e7a9e1b37f8cabcabd303d38fcc`
- immutable image tag: `2b02d22e897d5fe736f93267c72036d951f74082`
- production Compose digest pin: verified
- rollback: `v3.8.0-dev.1` / `sha256:acafde09bd74d535fb706acde68f7e6279283ac49f6d1863585d672fb691ac02`
