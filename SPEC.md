# WorkProof Runtime Specification - v0.5-dev

## 1. Purpose

Represent a user's bounded digital outcome as a durable Work Object, execute it through explicit capabilities, safely handle external effects, independently verify the outcome, and preserve portable proof.

## 2. Core loop

GOAL -> CONTRACT -> ROUTE -> ACT -> OBSERVE -> VERIFY -> RECONCILE/RECOVER -> DELIVER -> PROVE

## 3. Work Contract

A Work Contract contains:
- objective
- inputs
- constraints
- success criteria
- deliverables
- risk class
- optional approval requirement

A step's risk class must not exceed the contract risk class.

## 4. Capability contract

Every capability declares:
- stable name
- version
- supported operations
- risk class
- executable behavior

Capabilities are replaceable adapters. Routing must respect risk ceilings.

## 5. Effect contract

An Effect Record tracks:
- effect ID
- idempotency key
- operation
- capability
- risk class
- attempts
- attempt log
- receipt / observed state
- lifecycle timestamps

A repeated idempotency key resolves to the same durable effect record.

## 6. External-effect safety

For external writes:
- policy can require approval before execution
- the capability should expose a deterministic idempotency strategy
- an ambiguous outcome must be reconciled against external state before a blind retry
- successful completion is not declared until the Work Contract's success criteria are independently checked

The GitHub issue capability requires idempotencyMarker and writes the marker into the issue body so reconciliation can identify an already-created issue after a lost acknowledgement.

## 7. Verification contract

A verifier receives the Work Object, a success criterion, and known evidence and returns:
- criterion
- pass/fail status
- details
- evidence references

Boolean-only completion is insufficient.

## 8. Evidence and proof

Evidence references identify concrete observed states, artifacts, URLs, or receipts.

Proof bundles can be hashed using canonical JSON plus SHA-256. The digest is tamper-evident integrity metadata; it is not a digital signature.

## 9. Persistence

A Work Object may be persisted after major transitions, effect planning, step completion, and final verification.

## 10. Packs

A pack is compatible only when its declared capabilities, verifiers, policies, fixtures, and version metadata agree with the implemented extension.

The GitHub pack manifest is stored at docs/packs/github-pack.json.

## 11. Non-goals

The runtime is not defined as:
- a generic agent framework
- a browser automation engine
- a workflow/queue product
- a memory database
- an observability backend
- an OSINT graph
- an LLM requirement

Those systems can be integrated as capabilities or adapters.

## 12. v0.5 acceptance target

The v0.5 development gate requires:
- live GitHub read integration
- independently verified repository state
- controlled GitHub external-write capability behind approval
- local lost-acknowledgement fault injection with no duplicate write
- evidence-bearing reconciliation
- proof integrity verification
- pack compatibility metadata
- green CI
