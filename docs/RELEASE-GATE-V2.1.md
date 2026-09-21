# Release Gate v2.1-dev - Authenticated Studio Control

Date: 2026-09-21

## Scope

Add authenticated Studio control delegation without creating a second authorization or mutation authority.

## Acceptance gates

- [x] v2.0 read-only Studio behavior remains intact.
- [x] Studio exposes optional dispatch delegation through the control plane.
- [x] Studio exposes optional cancel delegation through the control plane.
- [x] Studio exposes optional resume delegation through the control plane.
- [x] Missing bearer credentials are rejected before forwarding.
- [x] Read-only credentials cannot perform Studio mutations.
- [x] Control responses are sanitized before crossing the Studio API boundary.
- [x] No local Work Object mutation path is introduced.
- [x] Control-plane request IDs and audit events remain authoritative.
- [ ] Feature CI green on final head.
- [ ] Merged-main CI green on merge commit.

## Safety boundary

Studio control is a presentation-layer proxy. Authorization, state transitions, and mutation audit remain owned by the authenticated control plane.

## Milestone result

The v2.1-dev authenticated Studio control milestone is complete only after feature CI and merged-main CI pass on the final implementation state.
