# Security Evidence v1.1

Date: 2026-09-21

## Purpose

Provide repeatable security evidence for the authenticated self-hosted registry before merge.

## Controls tested

- Bearer authorization uses a strict token grammar and rejects malformed authentication headers.
- Stored credential material is SHA-256 hashed; plaintext bearer tokens are not persisted.
- Token comparisons use constant-time comparison after fixed-length hash validation.
- Credential IDs and namespace identifiers are constrained to explicit allowlists.
- Namespace vault mapping stays under the registry root.
- Duplicate credential identities and malformed policy records are rejected.
- Read and write permissions are evaluated separately.
- Revoked credentials are rejected immediately.
- Authorization audit entries record credential identity and decision metadata, not plaintext bearer tokens.
- Registry proof ingress/egress continues to require proof-integrity validation.

## CI gates

The repository runs the focused `registry-security.test.ts` regression suite as part of the complete test suite and executes `npm audit --audit-level=high`.

## Security boundary

This is implementation-level evidence, not a penetration test or formal security audit. It does not prove safety against every deployment-specific threat.

## Acceptance

Security evidence is considered present only when the focused tests and the CI dependency audit both pass on the exact candidate commit.
