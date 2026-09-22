# WorkProof Runtime v3.4.0-dev.3

Product-readiness prerelease for the local-first Digital Work Operator.

## Included

- Local-first product readiness contract and release gates.
- Runtime version alignment from package metadata.
- Studio configuration wiring for control-plane, proof-vault, and trust-policy settings.
- Persistent Work Object restart smoke and safe CLI resume.
- Packaged `workctl` executable with successful help/version commands.
- CI smoke that installs the npm package, executes a real research mission, and verifies its proof artifact.
- Collision-safe atomic local Work Object persistence.
- Least-privilege CI repository permissions.
- Existing v3.4 M001-M005 benchmark, independent verification, reconciliation, recovery, and proof semantics retained.

## Verification target

The release workflow must complete:

- `npm run check`
- source-tree and dependency audits
- packaged CLI install/mission smoke
- release asset SHA256 verification
- published benchmark semantic verification
- container publication and health smoke
- immutable version/commit digest consistency

This is a prerelease. It does not claim that a public hostname, DNS, TLS certificate, reverse proxy, production secrets, or external production host has been provisioned.
