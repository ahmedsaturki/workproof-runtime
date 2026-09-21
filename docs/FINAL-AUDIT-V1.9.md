# Final Audit v1.9 - WorkProof Runtime

Date: 2026-09-21

## Release identity

- Main merge commit: `f0173fd9c0603fd1fa58ea6f722486f52a04f932`
- Feature CI candidate: run #528, successful on `d99c75c20ce8bb47b318deb491125e595f5a2d7a`
- Merged-main CI: run #530, successful on `f0173fd9c0603fd1fa58ea6f722486f52a04f932`
- Package version: `1.9.0-dev`

## Verification gates

The merged-main CI #530 completed successfully across all configured gates:

| Gate | Result |
|---|---|
| Chromium availability | PASS |
| Chromium CDP preflight | PASS |
| npm install | PASS |
| Dependency security audit | PASS |
| Required source tree | PASS, 114/114 before this closeout document |
| TypeScript build | PASS |
| Retention lifecycle suite | PASS |
| Sequential full integration verification | PASS, 30/30 test files |
| Benchmark | PASS |
| Demo | PASS |
| CLI proof verification | PASS |
| CLI mission execution | PASS |
| Live GitHub read smoke | PASS |

The final closeout commit adds this audit itself to the required source tree. The resulting documentation CI is required to re-prove the final 115/115 tree.

## v1.9 behavioral verification

- Durable saga recovery reloads persisted Work Objects after worker/process loss.
- A dedicated saga recovery lease establishes recovery ownership.
- Expired ownership can be replaced by a new worker.
- Verified compensation is skipped rather than replayed.
- Pending compensation is reconstructed from durable operation, capability, input, risk, source-effect lineage, and idempotency identity.
- Ambiguous compensation acknowledgement is reconciled against external state before retry.
- Stale recovery stops after ownership moves.
- Corrupt compensation lineage fails closed as unresolved.
- Recovery events and resulting saga state are persisted.

## Important defect found and fixed

A fault-injection test showed that an ambiguous compensation receipt could fall through to another execution attempt. The compensation runtime was changed so an ambiguous acknowledgement must reconcile external state before any retry. This is a runtime safety correction, not a test-only adjustment.

The recovery tests then passed the full integration gate on the final v1.9 candidate.

## Compatibility and security

- Existing v1.8 saga lineage remains intact.
- Effect input is optional for backward compatibility with older Work Objects.
- The Work Object schema now permits persisted effect input.
- Dependency audit reported zero high-severity vulnerabilities.
- No new external service dependency was introduced for saga recovery.
- Recovery uses the existing persistent lease authority rather than inventing a second storage system.

## Explicit non-claims

- Saga recovery is not arbitrary rollback.
- Compensation is only possible where an explicit compensation capability exists.
- Recovery ownership is not a global distributed consensus mechanism.
- External idempotency is still capability/system-specific and reconciliation-based.
- Verified receipt is not independent final proof.
- v1.9 remains a development milestone, not a claim that every production platform concern is complete.

## Closeout status

The v1.9 implementation and merged-main verification are complete. The documentation closeout is intentionally followed by another CI run so the final audit document is itself included in the source-tree gate.
