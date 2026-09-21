# WorkProof Runtime Architecture

## Product boundary

WorkProof Runtime is an outcome-first digital-work kernel. It does not define an agent, browser automation engine, workflow product, memory system, or observability backend as its primary abstraction.

The invariant object is the durable Work Object.

GOAL -> CONTRACT -> ROUTE -> ACT -> OBSERVE -> VERIFY -> RECONCILE/RECOVER -> DELIVER -> PROVE

## Layers

    User outcome
         |
         v
    Work Contract
    goal / success / risk / approval
         |
         v
    Orchestration
    Work Object / state / steps
         |
         v
    Capability Fabric
    local / HTTP / browser / GitHub
         |
         v
    Effect Ledger
    attempts / idempotency / receipts
         |
         v
    Verification
    independent checks + evidence
         |
         v
    Recovery
    reconcile / retry / substitute / stop
         |
         v
    Proof / Artifact
    durable evidence

## Core packages

### packages/core
Domain objects and lifecycle:
- Work Object
- Work Contract
- Effect Record / Attempt
- Evidence Reference
- Verification Result
- Work events

### packages/capabilities
Capability registration and operation routing.

A capability declares its supported operations and risk class. It is an adapter, not the invariant.

### packages/runtime
Runs ordered work steps, enforces Work Contract risk ceilings, applies policy gates, records effects, and invokes verification.

### packages/recovery
Handles ambiguous outcomes through bounded reconciliation, retry, substitution, or stop decisions. Ambiguous effects must be reconciled before a blind retry.

### packages/verification
Runs independent verifiers against success criteria and records evidence-bearing checks. A successful capability receipt is not proof by itself.

### packages/evidence
Builds portable proof bundles and deterministic SHA-256 integrity manifests.

### packages/storage
Persists Work Objects so execution state can survive process boundaries.

### packages/packs
Domain adapters. The GitHub pack covers repository read, issue creation behind external-write policy, deterministic idempotency markers, and independent verification.

## Safety invariants

1. A work step cannot exceed its Work Contract risk ceiling.
2. A capability cannot exceed the requested step risk ceiling.
3. External writes can be blocked by policy and human approval.
4. The GitHub issue write path requires a deterministic idempotency marker.
5. Ambiguous outcomes attempt external-state reconciliation before another write.
6. Verification is independent of the capability execution path.
7. Proof integrity is represented by a digest over canonicalized proof content.

## Extension boundary

MCP, A2A, workers, Studio, REST, SDKs, and remote control planes are adapters/surfaces around the Work Object model. They must not replace the kernel's outcome, effect, verification, recovery, and proof semantics.


## Saga recovery

Saga recovery is a coordination layer around persisted saga lineage.

    Persisted Work Object
          |
          v
    Recovery discovery
          |
          v
    Saga recovery lease
      /           \
   owned         busy
    |              |
    v              v
 pending      waiting_lease
 compensations
    |
    v
 reconcile -> execute -> verify -> persist
    |
    v
 ownership check
    |
    +--> stale owner: stop
    |
    +--> replacement owner: resume remaining pending work

The recovery lease prevents concurrent recovery workers from intentionally executing the same saga at the same time. It does not replace external idempotency or state reconciliation for individual effects.
