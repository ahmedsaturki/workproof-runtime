# Proof Compatibility Policy

## Current policy

Compatibility policy version: `0.1`.

| Format | Supported | Behavior |
|---|---|---|
| Proof bundle `0.1` | Yes | Normal verification |
| Integrity manifest `0.1` | Yes | SHA-256 integrity verification |
| Portable proof `0.1` | Yes | Bundle verification and import |
| Legacy proof `0.1` without integrity | Readable | Compatibility succeeds; integrity is reported as not present |
| Unknown proof bundle version | No | `workctl verify` exits with compatibility code 6 |
| Unknown integrity manifest version | No | `workctl verify` exits with compatibility code 6 |

The runtime does not silently reinterpret future formats. A new version requires an explicit compatibility policy update and regression coverage.

## Machine-readable behavior

`workctl compatibility <proof.json>` emits the compatibility status and current policy.

`workctl verify <proof.json>` includes `compatibility=<status>` before integrity, signature, trust, and status results.

Compatibility failure does not mutate a Work Object and does not authorize execution. It is a read-only format decision.

## Design rule

Compatibility is separate from integrity:

- compatibility answers whether the runtime understands the format;
- integrity answers whether the understood payload matches its declared digest;
- signature answers whether an identified signer authenticated the payload;
- trust answers whether that signer is currently trusted.

A proof may therefore be readable but lack integrity metadata, while an unknown proof format is not accepted as verifiable.
