# Final Audit v0.5-dev

Date: 2026-09-21

## Audit scope

This audit covers the merged main branch after the v0.5 integration work.

Verified commit:
d9af0d9358e3ceae4468bdf546f1990353feb7bb

Verified CI:
GitHub Actions run #34

## Functional evidence

The verification pipeline passed:

- Source-tree audit: 59 required paths, missing 0.
- TypeScript strict build: PASS.
- Automated tests: 28/28 PASS.
- Benchmark: PASS.
- Demo: VERIFIED.
- CLI proof verification: VERIFIED.
- CLI mission execution: VERIFIED.
- Live GitHub read-only smoke: PASS.

The 28 tests include the original v0.4 acceptance coverage plus:
- live-shaped GitHub read and independent verification
- GitHub external-write approval enforcement
- lost-acknowledgement reconciliation with one POST
- GitHub pack manifest compatibility
- proof integrity and tamper detection
- strict GitHub input validation
- two-system lost-acknowledgement reconciliation
- persisted-effect resume protection against duplicate execution

## Reliability findings

The runtime now distinguishes receipts from independent proof and records external effects with idempotency keys and operation context.

Ambiguous effects are reconciled before a blind retry. Persisted acknowledged effects are skipped during resume to prevent a second external execution.

## Safety findings

External writes are classified explicitly as external_write and can require human approval before capability execution.

The GitHub write path requires a deterministic marker that can be found in external state.

No irreversible live third-party write was introduced into CI.

## Integrity findings

Proof bundles have deterministic canonicalization and SHA-256 digest verification.

This provides tamper-evident integrity only. It does not establish signer identity or non-repudiation.

## Architecture findings

The Work Object remains the invariant product primitive. GitHub is implemented as a capability/verifier pack rather than becoming the product model.

The remote milestone remains deliberately separate from generic agent, workflow, browser, MCP, memory, observability, or OSINT products.

## Remaining risk / next work

1. Concurrent independent writers can race on marker preflight because the GitHub API path used here does not provide a native atomic idempotency key.
2. General compensation/saga semantics are not yet implemented.
3. External browser navigation is not proven where the environment blocks it.
4. Distributed workers and a remote control plane are not implemented.
5. User-facing Studio/API/SDK surfaces are not implemented.
6. Secrets are provided through environment variables; a broader redaction/secret-lifecycle subsystem is still a platform concern.

## Audit conclusion

The merged v0.5-dev integration milestone is internally consistent with its documented scope and its verified CI evidence. It should be treated as a proven development kernel/integration checkpoint, not as a completed production platform.
