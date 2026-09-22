# Product Direction V10 — Verified Digital Work Ecosystem

## Product thesis

The product is not a generic agent framework. It is a digital-work substrate where a user outcome is represented as a durable Work Object and executed through interchangeable capabilities, with explicit external effects, verification, reconciliation, recovery, and proof.

## Core loop

`GOAL → CONTRACT → ROUTE → ACT → OBSERVE → VERIFY → RECONCILE/RECOVER → DELIVER → PROVE`

## Core objects

- Work Object
- Work Contract / Outcome Contract
- Capability
- Effect / Effect Attempt
- Verification Check
- Evidence Reference
- Artifact
- Policy Decision
- Recovery Decision

## Ecosystem layers

### Core
Work lifecycle, effect ledger, idempotency keys, evidence, verification, recovery.

### Capabilities
Search, browser, HTTP, files, Git/GitHub, database, documents, messaging, publishing, shell, and domain-specific packs.

### Workers
Local process, browser worker, container worker, and later remote workers.

### Control
Identity, permissions, risk ceilings, approval gates, budgets, audit, and secrets handling.

### Developer platform
CLI, REST API, SDKs, Pack SDK, Verifier SDK, worker SDK.

### User platform
Studio, work history, proof viewer, reconciliation queue, templates.

### Interoperability
MCP, A2A, OpenTelemetry, webhooks, and connector bridges as adapters—not as the product definition.

## Product boundary

Avoid rebuilding generic browser agents, generic workflow engines, generic MCP registries, generic memory systems, or generic observability platforms. Integrate them where useful while keeping Work Objects, outcome contracts, external-effect safety, verification, and proof as the invariant layer.

## Success metrics

- False-Done rate
- Duplicate external-effect rate
- Verified completion rate
- Ambiguous-outcome resolution rate
- Recovery success rate
- Capability substitution success rate
- Human intervention rate
- Cost and latency per verified outcome
