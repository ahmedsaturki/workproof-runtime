# Release Gate v3.6 — v3.6.0-dev.1

Date: 2026-09-22

## Scope

Promote the MCP interoperability adapter as a distributable WorkProof product surface while preserving the existing outcome/proof authority model.

## Required acceptance

- [x] MCP v2 stdio adapter implemented with official TypeScript SDK
- [x] Capability discovery tool
- [x] Work Object read tool
- [x] Dispatch/resume/cancel mutation tools
- [x] Explicit idempotency key requirement on mutation tools
- [x] Control Plane remains the execution/auth/proof boundary
- [x] MCP client protocol acceptance
- [x] Packed MCP product smoke
- [x] Source-tree and CI integration
- [x] Mainline CI on release closeout
- [x] GitHub Release publication and post-publication SHA256 verification
- [x] GHCR publication, digest lineage, and runtime smoke
- [x] Production Compose pin and deployment documentation
- [x] Main promotion and post-merge CI verification

## Stop conditions

Do not call v3.6.0-dev.1 verified if the MCP adapter bypasses Control Plane authorization, accepts mutation without an explicit idempotency key, or is unable to prove the packed artifact is the one being exercised.

## Product boundary

MCP is interoperability only. It does not redefine WorkProof execution, verification, reconciliation, recovery, or proof semantics.


## Published evidence

- GitHub Release: `v3.6.0-dev.1` (ID 393506625)
- Release target commit: `de3ad9fcc10b9db7487c78620607f669249adaa9`
- Release verification workflow: #161 — success
- Container verification workflow: #158 — success
- GHCR digest: `sha256:2c5ba1b58697ec545cf7098d93e8750394b9b1e2ccd9e8f45b647cec689bd247`
- Immutable GHCR tag: `de3ad9fcc10b9db7487c78620607f669249adaa9`
- Rollback release: `v3.5.0-dev.1`
- Rollback digest: `sha256:ab5b90eb3722b96d714f105536f5c4d6cdc18cebe22992c4fe758fbc88f547d7`
- Published assets: 5/5 and post-publication SHA256 verification succeeded
- Container verification: health, Compose restart/persistence, TLS/auth topology, anonymous pull, and OCI provenance succeeded
- MCP protocol acceptance and packed-package smoke succeeded on the release branch before publication
