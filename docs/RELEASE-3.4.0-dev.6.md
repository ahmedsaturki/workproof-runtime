# WorkProof Runtime v3.4.0-dev.6

Coherent prerelease built from the verified main line.

## Included

- v3.4 benchmark and recovery/proof runtime baseline.
- Local-first WorkProof Studio and packaged `workctl`.
- Safe Work Object resume with persisted idempotency input checks.
- Portable proof export/import with artifact sidecars and independent bundle verification.
- Explicit versioned proof compatibility policy with strict unsupported-version handling.
- Release/container lineage hardening and local production digest pinning.

## Verification target

The release workflow must pass the full repository check, package installation/mission proof smoke, release asset SHA256 re-download verification, and benchmark semantic verification.

The container workflow must build from the exact release-tag commit, verify OCI revision/version, publish the canonical immutable commit image, pass runtime `/health`, anonymous pull, and version/commit digest consistency.

This remains a prerelease. It does not claim public DNS/TLS/reverse-proxy/external-host/production-secret provisioning.
