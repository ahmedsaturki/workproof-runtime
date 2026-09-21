# Release Gate v3.3-dev - Local Message Outbox

Date: 2026-09-21

## Scope

Add an Email / messaging capability family as a local durable outbox before any external SMTP delivery.

## Acceptance gates

- [x] No new npm runtime dependency.
- [x] Local RFC-style message composition.
- [x] Deterministic Message-ID and SHA-256 content identity.
- [x] Deterministic outbox filename derived from content digest.
- [x] Repeat identical payloads resolve to the same persisted message without duplicates.
- [x] Strict address validation.
- [x] Header-injection rejection.
- [x] Subject/body/message size bounds.
- [x] Evidence-bearing capability result.
- [x] Independent persisted-message verification.
- [x] Pack compatibility manifest and fixture.
- [x] CLI registration.
- [ ] Feature CI.
- [ ] Merged-main CI.

## Safety boundary

This milestone never sends an external message. It creates a local `local_write` artifact. SMTP or remote messaging remains a separate, approval-gated capability.

## Verification requirement

The capability receipt is not proof. The verifier re-reads the persisted message and compares it to the deterministic representation.
