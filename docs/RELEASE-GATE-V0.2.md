# Release Gate v0.2-dev

## Required gates
- [x] TypeScript build passes.
- [x] Unit/integration tests pass.
- [x] Local work execution produces an external artifact.
- [x] Required outcome is independently verified.
- [x] Ambiguous side effect is reconciled before retry.
- [x] Capability registry supports substitution candidates.
- [x] Risk policy can block an unapproved external write.
- [x] Work object can be serialized and reloaded locally.
- [x] Research-to-artifact benchmark executes deterministically on supplied fixture.

## Explicit limitations
- Browser/search/email/publishing integrations are not production adapters yet.
- Persistence is local JSON, not a distributed durable store.
- Recovery is bounded and policy-light; compensation is not yet implemented as a complete subsystem.
- No claim of general autonomous task completion is made.

## Next gate
Prove M002/M003/M004/M005 with real adapters and induced failures before expanding Studio, marketplace, or remote-worker features.
