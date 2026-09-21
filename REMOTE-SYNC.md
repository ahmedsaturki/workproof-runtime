# Remote Sync and Development Status

Date: 2026-09-21

## main

main is the verified v0.4 development checkpoint.

## v0.5 feature branch

feature/v0.5-github-integration is intentionally separate while real integration behavior is being validated.

Current branch capabilities:
- GitHub repository read + independent verification
- GitHub issue external-write capability
- approval gate
- deterministic idempotency marker
- local lost-acknowledgement reconciliation
- proof integrity
- pack manifest

## History note

Remote history was reconstructed as verified commits through the GitHub API rather than as a byte-identical push of the original Git object database.

## Rule

Do not call v0.5 production-ready until cross-system fault injection, browser boundary verification, worker/control-plane boundaries, and release evidence are complete.
