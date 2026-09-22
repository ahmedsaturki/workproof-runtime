# Release Gate v0.4-dev — Verified Local Kernel

Date: 2026-09-21

## Scope

This gate covers the local engineering kernel for outcome-first digital work: Work Objects, capability routing, effect tracking, verification, reconciliation, recovery, local persistence, controlled browser execution, HTTP discovery/publication packs, policies, evidence, and benchmarks.

## Verified

- TypeScript build passes with `tsc -p tsconfig.json`.
- `npm test` passes: 22/22 tests.
- `npm run benchmark` passes all benchmark missions.
- `npm run demo` produces a verified demo work object.
- CLI proof verification returns `verified` and zero exit status.
- `git diff --check` passes.
- `npm pack --dry-run` succeeds and produces a 46-file package preview.
- Real local HTTP ambiguous-create reconciliation avoids a duplicate POST.
- Real local HTTP publication reconciliation avoids duplicate publication.
- Capability substitution works after repeated rejection and repeated ambiguous outcomes.
- Reconciliation verifier exceptions are captured as auditable recovery events.
- External-write approval gating executes inside the runtime, not only as a helper test.
- Persisted Work Objects can be reloaded from the JSON repository.
- Work-step risk cannot exceed the Work Contract risk ceiling.
- Chromium/CDP local acceptance executes an injected HTML workflow and verifies the resulting DOM state.

## Important limitations

- This is still a development kernel, not a production platform.
- Browser acceptance is restricted to a local/injected page in this environment. Chromium policy blocks local HTTP navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`; no policy bypass was used.
- No live third-party email, social publishing, financial, or destructive operation was executed.
- No external LLM is required or exercised by the current kernel.
- Compensation is modeled conceptually but not yet a general-purpose saga/rollback engine.
- Distributed workers, remote control plane, marketplace/registry, Studio UI, and MCP/A2A bridges remain extension layers, not completed products.
- The project does not claim global novelty. Multiple adjacent systems exist around browser agents, durable execution, effect ledgers, tool routing, and outcome verification.

## Quality rule

A successful function call, HTTP response, or agent statement is not sufficient evidence of completion for an external side effect. The system must prefer independent read-after-write verification or reconciliation before retrying an ambiguous effect.

## Exit criteria for the next milestone

The next gate should add real browser navigation in an environment where policy permits it, at least one real third-party integration behind explicit approval, and fault-injection tests spanning two independent external systems.
