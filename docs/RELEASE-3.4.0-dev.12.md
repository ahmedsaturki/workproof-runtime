# WorkProof Runtime v3.4.0-dev.12

Product-surface prerelease extending the verified v3.4.0-dev.11 lineage.

## Included

- Runnable authenticated control-plane process around the existing HTTP control-plane kernel.
- SDK dispatch support for executable Work Steps, including explicit idempotency keys and risk ceilings.
- Persistent Work Objects, mission definitions, proof bundles, audit records, and control-plane idempotency state.
- Local-first control-plane startup with a hard safety boundary: non-loopback binding requires an explicit auth policy.
- End-to-end packaged control-plane acceptance coverage for health, dispatch, execution, persistence, proof generation, Work Object retrieval, and idempotent replay.
- `npm run control-plane` product entrypoint.

## Distribution boundary

This prerelease remains private to the repository/package ecosystem and is not an npm registry publication. Public DNS, production host provisioning, externally managed secrets, and public reverse-proxy infrastructure remain deployment-time resources.

## Verification

The merged control-plane product-surface change passed the full repository CI gate on the main lineage, including TypeScript build, packed CLI smoke, external topology smoke, release lineage checks, retention lifecycle, full unit/integration suite, benchmark, demo, CLI proof/mission execution, multi-capability mission execution, and live GitHub integration smoke.
