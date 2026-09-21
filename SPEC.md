# Operational Reality Core — v0.1 Specification

## Purpose

Reconstruct observable system behavior from evidence-bearing executions and represent it as a versioned operational model that can be compared across runs or releases.

## Explicit non-goals

- Not a browser automation framework.
- Not a generic workflow engine.
- Not a knowledge graph product.
- Not an agent runtime.
- Not an observability backend.
- Not an LLM requirement.
- Not an exploit or penetration-testing product.

## Core primitive

`Observation → Evidence → Transition → Model → Diff`

### Observation

An atomic execution observation connecting an action on an entity with an observed state transition and optional effects, dependencies, environment, and evidence.

### Evidence

A stable reference to a concrete artifact such as a DOM snapshot, screenshot, HTTP exchange, response, event, log, or trace.

### Transition

A normalized fact of the form:

`entity type + action + state before + state after`

with aggregated effects, surfaces, evidence, and environments.

### Model

A deterministic set of observed transitions and known states for a bounded observation corpus.

### Diff

A semantic comparison of two models that highlights added, removed, and changed transitions and side effects.

## Evidence discipline

The implementation MUST distinguish observed data from inferred data. The v0.1 model contains only observations explicitly supplied by adapters; future inference layers must mark derived claims and confidence separately.

## Determinism

Given identical ordered observations, normalization MUST yield the same model identifier and transition ordering.

## Privacy / local-first

The core package must work without cloud services, hosted databases, API keys, or language models.

## v0.1 acceptance test

Given two versions of the supplied Order Lab fixture, the engine must identify that the `order.approve` transition remains present while `notification_sent` was removed and `invoice_created` was added.
