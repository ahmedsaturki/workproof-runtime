# WorkProof Runtime Status

Date: 2026-09-24

## v3.8.14 publication closeout

- package version: `3.8.14`
- stable release tag: `v3.8.14`
- stable release commit: `8fcb6cfca67d865ce56533ad56e1a508d997e98a`
- GitHub Release ID: `395985478`
- Release workflow #307: success
- Container workflow #304: success
- GHCR image: `ghcr.io/ahmedsaturki/workproof-runtime:3.8.14`
- GHCR digest: `sha256:fcde1ff9748e8c0306160b3d6e61fd03680b1cfb35e51ef305eab4b20640050c`
- commit-addressed image tag: `8fcb6cfca67d865ce56533ad56e1a508d997e98a`
- five release assets published and SHA256-verified
- publication verification confirmed benchmark semantics, source/package version alignment, release/tag lineage, and final GHCR provenance

## Main verified baseline

The current stable release line is **v3.8.14**. Main CI is required to verify every post-release reconciliation.

Main contains the v3.4 executable benchmark, restart/resume safety, portable proof, explicit proof compatibility, operator guidance, packaged operator docs/examples, multi-capability execution, external-topology validation, distribution hardening, Control Plane policy/idempotency safety (including terminal mutation-error finalization), network-boundary hardening, immutable container-base provenance, and bounded production resource/log controls.

## Previous stable v3.8.13

- package version: `3.8.13`
- stable release tag: `v3.8.13`
- stable release commit: `dadef28ce8fbd299201a228673f1c2737c5b7d62`
- GitHub Release ID: `394849659`
- Release workflow #305: success
- Container workflow #302: success
- GHCR image: `ghcr.io/ahmedsaturki/workproof-runtime:3.8.13`
- GHCR digest: `sha256:c9a9f6f6f0fb111dc64d42b1a2746091f14366c389c1af6eb3b0683c6e3fe564`
- commit-addressed image tag: `dadef28ce8fbd299201a228673f1c2737c5b7d62`
- five release assets published and SHA256-verified
- publication verification confirmed benchmark semantics, source/package version alignment, release/tag lineage, and final GHCR provenance

## Previous stable v3.8.12

- package version: `3.8.12`
- stable release tag: `v3.8.12`
- stable release commit: `19b1efbfbc5f6f2d14eae5538f339667bd9fbb92`
- GitHub Release ID: `394761988`
- Release workflow #284: success
- Container workflow #281: success
- GHCR digest: `sha256:5690c65d0425c743c4fa0ebc1a31f913497eb6b7d4e8fa11a129a833aa926d5d`
- commit-addressed image tag: `19b1efbfbc5f6f2d14eae5538f339667bd9fbb92`

## Published snapshot vs current main

The `v3.8.14` GitHub Release and source/container assets were verified against release commit `8fcb6cfca67d865ce56533ad56e1a508d997e98a`. The current `main` reconciliation records the published GitHub Release and GHCR evidence without rewriting or retagging the published release and without changing runtime semantics.

## Current main closeout

- v3.8.14 stable release: published and fully Container-verified
- current main lineage: reconciled to the exact v3.8.14 GitHub Release target and GHCR digest
- production Compose: pinned to exact v3.8.14 tag@digest
- container base: immutable Node 24.21.0 Trixie slim digest enforced by CI/Release/Container
- production resource envelope: init, 10s stop grace, 1 CPU, 1 GiB RAM, 512 PIDs, 10 MiB × 3 JSON log rotation
- GitHub governance: `main` ruleset (required `verify`, required signatures, required review-thread resolution) and `v*` tag ruleset active; release `v3.8.14` immutable with five assets
- release publication path: draft-first for future immutable releases (create draft, upload and validate exact five assets, then publish); published immutable assets are not rewritten on rerun (PR #175)
- release publication path draft-first coherence recorded in docs after PR #176 (`f95a8c0`)
- Control Plane terminal mutation errors finalize the claimed idempotency key (PR #177 `5f0830e`, SSH-signed under required signatures)
- control-plane / packed MCP / A2A startup waits honor `WORKPROOF_TEST_TIMEOUT_MS` (default 30s) so packed smokes do not flake under parallel load
- STATUS / FINAL-AUDIT / GITHUB-GOVERNANCE closeout for PR #172–#178 plus packed startup-timeout hardening landed in PR #178 (`cb7f1f4`, SSH-signed)
- PR #178 closeout and signed-merge lineage recorded in STATUS / FINAL-AUDIT / GITHUB-GOVERNANCE via PR #179 (`1b22c91`, SSH-signed)
- PR #179 closeout and release-readiness records recorded via PR #180 (`8406263`, SSH-signed)
- v3.8.14 release preparation (version bump, release notes, metadata gate) landed in PR #181 (head `92e3fb1`, merged `8fcb6cf`, SSH-signed)
- open pull requests and issues: zero at this closeout verification

## Product gates

- [x] local WorkProof Studio
- [x] packaged `workctl`
- [x] Work Object restart/resume
- [x] idempotency operation/input drift protection
- [x] portable proof export/verify/import
- [x] versioned proof compatibility
- [x] operator guidance UX for failure/ambiguity/recovery/verification
- [x] operational overview and attention summary
- [x] production Compose restart/persistence smoke
- [x] production Compose resource/log envelope smoke
- [x] exact release-commit Docker build context
- [x] package includes operator docs and representative mission examples
- [x] representative multi-capability mission
- [x] Studio capability-chain visibility
- [x] disposable external-topology TLS/auth/backup/restore/rollback smoke
- [x] authenticated capability inventory and Studio registry visibility
- [x] packed control-plane product smoke
- [x] Control Plane execution-policy enforcement
- [x] terminal failed-idempotency replay safety (including terminal 4xx/404 finalize, PR #177)
- [x] Studio loopback network boundary
- [x] Registry non-loopback authentication boundary
- [x] immutable container base provenance

## Benchmark

M001-M005: 5/5 verified.

- verifiedCompletionRate: 1.0
- falseDoneCount: 0
- duplicateExternalEffectCount: 0
- ambiguousOutcomeResolvedCount: 1
- capabilitySubstitutionCount: 1
- evidenceCompleteRate: 1.0
- humanInterventionCount: 0

## Distribution and operations

- [x] reproducible source distribution
- [x] npm-compatible package artifact
- [x] GitHub Release publication and post-publication verification
- [x] GHCR publication and anonymous pull verification
- [x] pinned localhost production Compose
- [x] production deployment runbook
- [x] disposable external-topology smoke with TLS/auth/backup/restore/rollback
- [x] immutable container-base verification
- [x] bounded production resource/log envelope
- [x] GitHub Release immutability and `v*` tag deletion/update protection verified live
- [x] draft-first immutable release publication path (PR #175) with exact five-asset validation before publish
- [external] public host/DNS/TLS/auth/secrets provisioning remains outside the repository's current provisioned resources
- [external] Vercel Git integration (if still connected) is configured as a static site and is not part of the WorkProof Runtime product surface; disconnect it from Vercel settings rather than faking a `public/` output directory

The disposable topology gate verifies TLS, authentication, secret non-leakage, persistent state, backup/restore, rollback to a previous verified digest-pinned release, and deny-by-default network exposure. Public infrastructure remains a separate external resource; the public-host portion is deployment provisioning, not a hidden runtime dependency.

## Verification rule

A capability receipt is not independent proof. Work is verified only when independent evidence satisfies the Work Contract and the published artifact remains verifiable outside the running operator.

## Historical release records

The historical v3.8.0, v3.8.1, v3.8.2, and v3.8.3 closeout records remain part of repository provenance. v3.8.2 is explicitly superseded and is not a rollback target.
