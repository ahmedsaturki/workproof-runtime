# Security Evidence v1.2

Date: 2026-09-21

## Scope

Security evidence specific to signed trust-policy synchronization and its registry transport boundary.

## Controls

- trust permission is distinct from ordinary proof-write permission.
- trust credentials remain namespace scoped.
- trust transport cannot be accessed by read-only or write-only credentials.
- trust snapshot application is separately authenticated and signer-authorized.
- snapshot digest/signature verification happens before trust state is accepted.
- administrative signer allowlists can be namespace-scoped so trust in one namespace does not implicitly authorize another.
- registry clients re-check trust snapshot digest and cryptographic signature after HTTP transport.
- trust snapshot records avoid exposing absolute registry filesystem paths.
- forged signer, malformed signature, same-epoch conflict, rollback, and namespace trust-boundary separation are covered by v1.2 regression tests.

## Boundary

This is focused implementation evidence, not a penetration test or formal certification. It is intended to make the changed authorization surface independently testable and auditable.
