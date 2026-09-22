# WorkProof Runtime v3.8.1

Patch release focused on Control Plane safety and mutation liveness.

## Included

- Control Plane dispatch and resume now execute through an explicit WorkProof execution policy.
- Work Contracts requiring approval cannot bypass the policy boundary.
- Non-loopback Control Plane binding is rejected unless an authentication policy is configured.
- Idempotent mutations that throw after claiming a key are finalized as terminal failures and safely replay the same failure response instead of remaining permanently pending or being executed again.
- Durable idempotency schema migration preserves existing v3.8.0 records while adding the terminal failed state.
- Regression coverage exercises dispatch and resume policy enforcement and failed mutation replay.

## Verification

The release branch must pass the complete CI/build/security/browser/package/integration/benchmark/demo/CLI/GitHub validation chain, followed by GitHub Release publication and GHCR image verification.

## Distribution note

The release artifact is the source/package snapshot for v3.8.1. The production Compose pin is reconciled to the independently verified v3.8.1 GHCR digest during post-publication main closeout so the immutable digest is never guessed in advance.

## Safety boundary

No public host, DNS, TLS certificate, production secret, or hosted Control Plane is implied by this source release.
