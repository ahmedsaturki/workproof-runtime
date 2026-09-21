# Extension Contract v0.1

A capability, verifier, or pack must be independently installable and must declare its behavior.

## Capability manifest
```json
{
  "name": "example.capability",
  "version": "0.1.0",
  "operations": ["example"],
  "riskClass": "read",
  "permissions": [],
  "verifier": "example.verifier"
}
```

## Required guarantees
- deterministic metadata
- explicit risk class
- explicit supported operations
- no hidden network use
- clear external-effect semantics
- idempotency behavior documented when side effects exist
- evidence hooks
- failure modes documented
- fixture-backed tests

## Verifier contract
A verifier returns a status-bearing check plus evidence. Boolean-only results are not sufficient for the ecosystem proof layer.
