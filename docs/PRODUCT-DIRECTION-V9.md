# Product Direction V9 — 2026-09-21

## Decision
Keep the evidence/behavior core as internal infrastructure. The user-facing product should center on durable **Work Objects** and real digital outcomes.

## Core thesis
The product should make digital work executable, recoverable, and provable. It should not sell itself as a generic agent framework, browser agent, workflow engine, verifier, or observability backend.

## First product surface
A local/self-hosted operator that can:
- take a bounded objective and explicit success criteria;
- select registered capabilities;
- execute real work;
- record external effects and idempotency keys;
- reconcile ambiguous results before retrying;
- verify outcomes with independent evidence;
- emit a portable proof bundle.

## Ecosystem
Long-term layers: Work Core, capability SDK, verifier SDK, recovery policies, workers, packs, CLI, Studio, CI, audit/proof viewer, and optional MCP/A2A bridges.

## v0.2 implementation target
1. Durable Work Object model.
2. Capability registry.
3. Effect ledger with idempotency.
4. Verification fabric.
5. Reconciliation-before-retry.
6. Portable proof bundle.
7. Deterministic local benchmark.

## Immediate benchmark expansion
- file creation + verification;
- ambiguous HTTP-style effect + read-after-write reconciliation;
- capability substitution;
- multi-step research to CSV artifact;
- controlled publication to a local test app.

## Kill criteria
Do not expand into broad Studio/marketplace/enterprise features unless end-to-end benchmarks show real advantage in verified completion, duplicate-effect avoidance, recovery, or integration cost.
