# Direction V8 — Expert Review — 2026-09-21

## Decision

Keep the current evidence/state core as internal infrastructure. Do not claim the generic Mission Engine or External-Action Transaction Engine as a unique invention. The current ecosystem contains substantial overlap across browser execution, durable actions, outcome verification, idempotency, compensation, action ledgers, and proof-carrying governance.

## Product recommendation

Build a user-facing **Digital Work Operator** only if the benchmark proves it can reliably complete useful multi-capability jobs with materially better outcome closure and recovery than simple agent loops. The operator is a product layer; the current Core remains a substrate.

### Core loop

```text
GOAL
  -> OUTCOME CONTRACT
  -> PLAN
  -> CAPABILITY SELECTION
  -> EXECUTE
  -> OBSERVE
  -> RECONCILE
  -> VERIFY
  -> RECOVER / SUBSTITUTE / COMPENSATE
  -> DELIVER
```

## What is crowded

- browser/computer-use agents;
- generic agent runtimes;
- durable workflow engines;
- deep-research agents;
- tool routers;
- postcondition/outcome verifiers;
- idempotency/action ledgers;
- saga/compensation systems;
- proof-carrying/governance systems.

## What can still be valuable

The value proposition should be product-level and benchmark-level, not a novelty claim:

1. One local/self-hosted operator that can use heterogeneous capabilities.
2. Explicit outcome contracts rather than chat completion.
3. Independent verification appropriate to the side effect.
4. Reconciliation before retry on ambiguous outcomes.
5. Safe capability substitution.
6. A portable mission artifact and evidence bundle.
7. A benchmark of real end-to-end digital work, including induced partial failures.

## First benchmark

### M001 — Research to artifact
Search -> extract -> dedupe -> validate -> CSV -> report.

### M002 — Web mutation
Prepare -> publish/update in a controlled system -> reopen -> verify exact final state.

### M003 — Git change
Inspect -> edit -> test -> commit -> push -> verify remote state.

### M004 — Ambiguous external effect
Trigger effect -> lose acknowledgement -> reconcile -> do not duplicate.

### M005 — Capability substitution
Primary capability fails -> select a compatible alternative -> verify the same outcome.

## Kill criteria

Stop the project as a general-purpose product if the benchmark cannot demonstrate at least one of these defensible advantages:

- materially fewer duplicate/false-completion incidents;
- materially higher verified completion on heterogeneous tasks;
- materially better recovery from ambiguous side effects;
- meaningfully lower integration cost for adding a new capability;
- a compelling self-hosted workflow that users prefer for ownership/privacy/reliability reasons.

## Current implementation status

The prototype currently demonstrates:

- mission execution;
- verification;
- fallback capability;
- ambiguous side-effect verification before retry;
- deterministic behavioral diff;
- local transaction demo.

These are proof-of-concept capabilities, not production guarantees.

## Current expert judgment

The strongest next step is not more abstract architecture. It is a **real end-to-end operator benchmark** with 3–5 useful missions and induced failure modes. The benchmark should decide whether the project deserves expansion into Studio, CI, MCP, SDK, and broader adapters.
