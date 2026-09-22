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
- [ ] Mainline CI on release closeout
- [ ] GitHub Release publication and post-publication SHA256 verification
- [ ] GHCR publication, digest lineage, and runtime smoke
- [ ] Production Compose pin and deployment documentation
- [ ] Main promotion and post-merge CI verification

## Stop conditions

Do not call v3.6.0-dev.1 verified if the MCP adapter bypasses Control Plane authorization, accepts mutation without an explicit idempotency key, or is unable to prove the packed artifact is the one being exercised.

## Product boundary

MCP is interoperability only. It does not redefine WorkProof execution, verification, reconciliation, recovery, or proof semantics.
