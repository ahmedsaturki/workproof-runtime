# WorkProof Runtime v3.4.0-dev.8

Coherent distribution release for the verified local-first product line.

Includes:

- WorkProof Studio operator guidance and effect summaries.
- Packaged workctl CLI, mission execution, resume, proof, vault, trust, and compatibility commands.
- Restart/resume safety and idempotency input drift rejection.
- Portable proof bundle export, verification, and import.
- Explicit versioned proof compatibility policy.
- Production Compose restart/persistence smoke.
- Exact release-commit Docker build context.
- Package distribution of operator docs and representative mission examples.

Release verification must cover the full repository check, five asset SHA256 re-download verification, benchmark semantics, GHCR provenance/digest consistency, runtime health, anonymous pull, and Compose restart/persistence.
