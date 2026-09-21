# Architecture

```text
           adapters
    web/http/cli/otel/event
               │
               ▼
        Observation Layer
               │
               ▼
         Evidence Layer
               │
               ▼
      Operational Model Core
               │
        ┌──────┴──────┐
        ▼             ▼
     Model           Diff
        │             │
        └──────┬──────┘
               ▼
       CLI / Studio / CI
```

## Boundaries

`packages/core` is domain logic only. It does not know about Playwright, databases, UIs, or LLMs.

`packages/diff` compares already-normalized models and does not capture data.

`packages/cli` is a thin interface over core packages.

Future adapters should translate their native events into the `Observation` contract rather than bypassing the core.
