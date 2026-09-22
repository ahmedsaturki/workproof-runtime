# WorkProof Runtime v3.4.0-dev.5

Resume-safety hardening prerelease built from current `main`.

## Included

- all verified v3.4.0-dev.4 product and distribution behavior
- persisted Effect input capture
- pre-execution operation/input compatibility checks for existing idempotency keys
- canonical JSON input comparison that ignores object-key order
- regression coverage preventing changed payloads from executing on resume
- existing packaged CLI, Studio, benchmark, recovery, proof, and GHCR distribution gates

## Verification

The release must pass the complete build/test/benchmark/demo/CLI/GitHub chain, release asset verification, and GHCR image/provenance/health verification.

This remains a prerelease and does not claim externally provisioned public production infrastructure.
