# Extension Contract v0.2

A capability, verifier, or pack must be independently testable and must declare its behavior.

## Capability manifest

~~~json
{
  "name": "example.capability",
  "version": "0.1.0",
  "operations": ["example"],
  "riskClass": "read",
  "permissions": [],
  "verifier": "example.verifier"
}
~~~

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

## External-write rule

Any external-write capability must have an explicit idempotency strategy. When a remote native idempotency key is unavailable, the pack must define a deterministic reconciliation marker or equivalent lookup strategy.

Human approval may be enforced by the Work Contract and runtime policy. Approval must be checked before the capability executes.

## Verifier contract

A verifier returns a status-bearing check plus evidence. Boolean-only results are not sufficient for the ecosystem proof layer.

## Pack compatibility

A pack should publish a manifest containing:
- pack name/version
- capability name/version identifiers
- verifier identifiers
- policies
- fixtures/tests

The runtime test suite should assert that manifest metadata and implemented extensions remain aligned.
