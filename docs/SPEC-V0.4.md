# Operational Reality / Verified Digital Work — v0.4 Specification

## Purpose

Provide a local-first kernel for bounded digital work in which an intended outcome becomes durable work, is executed through interchangeable capabilities, and reaches a final status only through explicit verification or an honest unresolved state.

## Core lifecycle

`GOAL → CONTRACT → ROUTE → ACT → OBSERVE → VERIFY → RECONCILE/RECOVER → DELIVER → PROVE`

## Work Contract

A work contract MUST include:

- objective
- success criteria
- deliverables
- overall risk ceiling

It MAY include inputs, constraints, and approval requirements.

A Work Step MUST NOT exceed the Work Contract risk ceiling.

## Capability

A capability declares a stable name/version, supported operations, risk class, and an executable operation contract.

Capabilities SHOULD be independently replaceable. The runtime MAY substitute a compatible capability when policy and risk permit it.

## External effects

An effect is tracked independently from the tool-call response.

Effect states include:

`planned → dispatched → acknowledged → observed → verified`

Ambiguous execution is represented as `unknown` and MUST be reconciled before blindly retrying.

Each attempt records:

- attempt number
- selected capability
- status
- start/end timestamps
- receipt when available

## Idempotency

Every side-effecting Work Step MUST provide an idempotency key.

A retry after an ambiguous outcome MUST first consult a reconciliation path. If the external effect is found, the runtime MUST NOT dispatch a duplicate action.

## Verification

Verification is independent from the capability receipt. A receipt proves the capability returned a result; it does not necessarily prove the intended external outcome.

A work item can end as:

- `verified`
- `partial`
- `failed`
- `unresolved`
- `unverifiable`
- `cancelled`

Missing success criteria cannot produce `verified`.

## Evidence

Evidence references SHOULD point to concrete observations or artifacts. Observed facts, inferred claims, and expected contract state MUST remain distinguishable.

## Recovery

Recovery decisions include:

- retry
- reconcile
- substitute
- stop

Verifier failures during reconciliation MUST be recorded rather than silently converted into a successful or failed external effect.

## Policy

Execution is subject to:

- Work Contract risk ceiling
- capability risk declaration
- optional policy maximum risk
- optional approval gate

High-risk or irreversible effects SHOULD require explicit policy approval.

## Browser scope in v0.4

The current browser pack uses Chromium/CDP and supports a controlled injected local HTML page for acceptance tests. External site navigation remains environment/policy dependent and is not claimed as generally available in this release.

## Current non-goals

- production distributed control plane
- generic agent framework
- generic browser automation framework
- generic workflow/orchestration platform
- public marketplace
- unrestricted autonomous high-risk actions
- global novelty claim
