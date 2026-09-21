# Ecosystem Architecture v1

## Product thesis

Build a self-hosted digital-work ecosystem centered on a durable **Work Object** rather than a generic agent, workflow, or browser runtime.

A Work Object represents a user outcome and its full execution lifecycle:

`intent → plan → capability selection → action → observation → verification → reconciliation → recovery → delivery → proof`

## Layers

### 1. Work Contract
- Objective
- Inputs
- Constraints
- Success criteria
- Deliverables
- Risk policy
- Approval policy
- Stop conditions

### 2. Orchestration Kernel
- Work state machine
- Plan/run/resume
- dependency tracking
- checkpointing
- bounded retries
- scheduling hooks

### 3. Capability Fabric
Capabilities are adapters, not the product:
- browser
- HTTP/API
- search/discovery
- files/documents
- shell/scripts
- GitHub/Git providers
- databases
- email/messaging
- publishing
- maps/data sources

Every capability declares:
- supported operations
- input/output schema
- side-effect class
- idempotency strategy
- observability hooks
- verification strategy
- recovery/compensation options
- required permissions

### 4. Verification Fabric
Verifier types:
- read-after-write
- public-state verification
- artifact verification
- schema/data validation
- cross-source consistency
- identity/ownership verification
- time/state verification
- custom domain verifiers

Verification must produce evidence, not just a boolean.

### 5. Reconciliation & Recovery
The system distinguishes:
- succeeded
- failed
- ambiguous
- partially committed
- verified
- unresolved

Recovery choices:
- inspect/reconcile
- retry safely
- substitute capability
- resume from checkpoint
- compensate reversible effects
- request human intervention
- stop

### 6. Evidence & Reality Core
Preserve:
- raw observations
- receipts
- snapshots
- artifacts
- external IDs
- evidence links
- state transitions
- environment information
- derived claims and confidence

Do not treat agent narration as proof.

### 7. Artifact Layer
First-class outputs:
- datasets
- documents
- reports
- files
- commits/PRs
- URLs
- message IDs
- structured results
- proof bundles

### 8. Interfaces
- CLI
- local UI / Studio
- REST API
- SDK
- automation hooks
- optional MCP adapter
- optional A2A adapter

### 9. Governance
- permissions
- secrets isolation
- allowed domains/actions
- risk classes
- human approval gates
- audit log
- rate limits
- budgets

### 10. Ecosystem / Packs
A pack bundles:
- capabilities
- verifiers
- schemas
- policies
- test fixtures
- examples

Examples:
- Web Research Pack
- Data Extraction Pack
- GitHub Engineering Pack
- Publishing Pack
- Email/Outreach Pack
- CRM Operations Pack
- Document Pack

## Non-goals

Do not become:
- another general-purpose agent framework
- another browser automation engine
- another workflow engine
- another MCP registry
- another memory product
- another observability backend
- another OSINT graph product

## Core user experience

The primary interaction is outcome-first:

`What needs to get done?`

The system then exposes:

`Plan → Live work → Verification → Exceptions → Final result → Proof`

## Initial product family

1. Work Core
2. Work CLI
3. Work Studio
4. Capability SDK
5. Verifier SDK
6. Pack SDK
7. Work CI
8. Work Audit / Proof Viewer
9. Optional MCP/A2A bridges

## v0.x build order

### v0.2
- durable Work Object
- capability registry
- local file + HTTP capabilities
- verification engine
- proof bundle
- reconciliation states

### v0.3
- Playwright browser capability
- web verifier
- search/extraction capability
- artifact pipeline
- recovery planner

### v0.4
- GitHub capability
- document capability
- controlled publishing capability
- Work Studio
- benchmark harness

### v0.5
- multi-capability missions
- ambiguous-effect recovery
- approval gates
- CI integration
- pack format

### later
- MCP/A2A adapters
- multi-worker execution
- remote workers
- enterprise policy
- multi-tenant deployment

## Benchmark requirements

Every release should measure:
- verified completion rate
- false-done rate
- duplicate external-effect rate
- ambiguous outcome resolution rate
- recovery success rate
- capability substitution rate
- human intervention rate
- artifact correctness
- evidence completeness

## Positioning

The ecosystem is not sold as “an agent that can do things”.

It is positioned as a system for **getting digital work completed and producing trustworthy proof of the result**.
