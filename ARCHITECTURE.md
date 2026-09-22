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

## Execution fencing

    Worker
      |
      | acquire(resource)
      v
    Persistent Lease Authority
      |
      | leaseId + revision
      v
    ExecutionFence
      |\
      | +--> assertOwned() before capability
      |\
      | +--> token -> optional conditional external write
      |
      +--> capability
      |
      +--> assertOwned() after capability

Lease acquisition prevents competing ownership; fencing prevents an older owner from crossing a guarded execution boundary after takeover. External systems must explicitly honor a token if they support fencing; internal checks alone cannot revoke an already-dispatched third-party request.

## Control mutation idempotency

    Client
      |
      | Idempotency-Key
      v
    Authenticated Control Plane
      |
      +--> durable request ledger
      |      |\n      |      +--> replay completed response\n      |      +--> reject key conflict\n      |      +--> reject concurrent duplicate\n      |
      +--> mutation
      |
      +--> audit

The durable request ledger protects authenticated control mutations from client retries and same-key races. It is intentionally separate from external-effect idempotency: a control mutation replay guarantee does not make a third-party write exactly-once.

## Control boundary

    Studio
       |
       | bearer token
       v
    Authenticated Control Plane
       |
       +--> authorization
       +--> state transition
       +--> mutation audit
       |
       v
    Work Object Repository

The Studio never becomes the authority for authorization or mutation semantics. Its control endpoints are a same-origin proxy and sanitize returned Work Objects.

The proof/audit view is a read-only projection over the authoritative proof vault. It recomputes integrity, signature validity, and optional trust state instead of trusting presentation metadata, and it does not expose vault filesystem paths.

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
Builds portable proof bundles and deterministic SHA-256 integrity manifests plus optional Ed25519 signatures.

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
8. Studio mutation is delegated to the authenticated control plane; Studio cannot bypass its authorization or audit model.

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
      /              owned         busy
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
