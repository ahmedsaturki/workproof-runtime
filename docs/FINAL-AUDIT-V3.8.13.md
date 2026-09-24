# Final Audit -- v3.8.13 Post-Release Closeout

Date: 2026-09-24

## Naming note

This document was first written as `docs/FINAL-AUDIT-V3.5.md`. Repository FINAL-AUDIT files historically used sequential audit milestones (`V3.0`..`V3.4`), which at the time tracked the product minor under audit. The current stable product baseline is **v3.8.13**; a file named `V3.5` would falsely imply product v3.5. The file is therefore registered as **`docs/FINAL-AUDIT-V3.8.13.md`** so the audit path matches the release it describes. Required source-tree count is unchanged (one path replaced, not added).

## Release identity

- Stable release: **v3.8.13** (unchanged by this closeout)
- Published release commit: `dadef28ce8fbd299201a228673f1c2737c5b7d62`
- Closeout commits on the PR branch: `9890153a048d91f927e7c31701e016483825a139` (`chore: finalize post-v3.8.13 product closeout`) and `7cae2764a405aa65971b4f959123f8c620f8cd64` (`fix: correct post-release audit record and CLI error semantics`), both SSH-signed
- Pull request: **#170** (`chore/post-v3.8.13-final-hardening` -> `main`) -- **merged** at `4bfd046195675b3bce65bd9cfc42cd1abd4c9d6a` (2026-09-23T22:32:11Z)
- Branch base at audit start: `main` @ `debcb194247632222b62bc7289558f71fce56674`
- Package version: `3.8.13`
- GitHub Release ID: `394849659` (5 assets, immutable)
- GHCR image: `ghcr.io/ahmedsaturki/workproof-runtime:3.8.13`
- GHCR digest: `sha256:c9a9f6f6f0fb111dc64d42b1a2746091f14366c389c1af6eb3b0683c6e3fe564`
- Verified rollback release: **v3.8.1** / `sha256:7908cc6a4473495b7b5c51f1a0527815f0a8ff0c6d9eaf20ebf1ddfb0479b5d0`
- Immediately preceding stable: v3.8.12 (historical; not the verified rollback target)

Published `v3.8.13` tag and assets were **not** rewritten. No stable tag was moved. This work is post-release hardening, UX, portability, and documentation only.

## Scope of change

Runtime authority semantics are unchanged: GOAL -> CONTRACT -> ROUTE -> ACT -> OBSERVE -> VERIFY -> RECONCILE/RECOVER -> DELIVER -> PROVE; receipt is not proof; no blind retry of failed external effects; fencing remains enforced; adapters are not a parallel authority.

## Verification target

- source-tree completeness
- secret scan
- container base pin verification
- solo governance gates
- published-lineage / GHCR digest verification
- main release-state allowlist integrity
- sequential unit/integration suite
- benchmark executable
- demo
- packed MCP / A2A / Control Plane smokes
- Chromium/CDP preflight
- external topology (TLS, auth, secret non-leakage, persistence, backup/restore, rollback, deny-by-default)
- packed container compose smoke
- CLI doctor, proof verification, and three representative missions
- CLI error UX (missing file, directory-as-file, malformed JSON, usage, `--help`/`--version`)
- Studio CLI surface (`studio --help` / `--version`)

## Gaps found in this audit pass and fixes applied

| Gap | Fix | Verification |
| --- | --- | --- |
| `.gitignore` / `.dockerignore` could allow runtime secret paths to be tracked or packed | Runtime secret path exclusions added | `secret-scan` EXIT 0; source-tree EXIT 0 |
| `scripts/verify-published-lineage.js` used a shell-dependent curl style (Windows-hostile) | Rewritten to Node `fetch` | `verify-published-lineage` EXIT 0; digest matches v3.8.13 |
| `scripts/external-topology-smoke.js` lacked Windows tool resolution and null-device portability | `resolveTool` / `WINDOWS_TOOL_CANDIDATES` / `sleepSeconds` / null-device handling | external topology EXIT 0 (all required flags true) |
| Docs mixed immediate predecessor with verified rollback | README + `docs/PRODUCT-READINESS-V1.md`: immediate previous stable v3.8.12 vs verified rollback v3.8.1 | release-metadata tests |
| Release-state allowlist incomplete for this closeout's post-release edits | `allowedPostReleaseFiles` extended | `verify-main-release-state` EXIT 0 |
| `npm test` parallel EPERM on Windows temp dirs | `removeTempDir()` retry in `test/persistent-leases.test.ts` | sequential suite is the gate; parallel hardened |
| CLI `verify` / `summarize` / `run` surfaced raw stacks / imprecise FS errors | `formatCliError` + `readJsonFile`: ENOENT -> `File not found: <path>`; EISDIR -> `Expected a file, but found a directory: <path>`; SyntaxError -> `Invalid JSON: ...`; no stacks | product-smoke regressions |
| Studio had no help/version surface | `studioUsage()`; `--help` / `--version` | studio help asserts |
| Audit filename ambiguous vs product baseline | Renamed to `docs/FINAL-AUDIT-V3.8.13.md`; source-tree registration updated; count remains 237 | source-tree EXIT 0 |

## Status

**v3.8.13 remains the current stable release. PR #170 is merged into `main` as `4bfd046195675b3bce65bd9cfc42cd1abd4c9d6a` with both branch commits SSH-signed under the active `required_signatures` ruleset. Distribution (GitHub Release + GHCR) was verified against the live publication. Published release artifacts remain immutable historical evidence.**

Post-release governance closeout continued on 2026-09-24 with signed merges: PR #172 (`8179ce8`, live `v*` tag-ruleset and release-body reconciliation), PR #174 (`42bc9a4`, live release immutability assertions and audit coherence), and PR #175 (`ac99bb1`, draft-first immutable release publication: create draft, attach and validate the exact five assets, then publish, and refuse asset rewrites on published immutable releases). All three heads were SSH-signed under the active `required_signatures` ruleset before merge. Open pull requests and issues after #175: zero. Historical remote branches that are fully merged into `main` were pruned; diverged historical branches were retained (not deleted) to preserve unique ancestry.

## Recorded outcome (local verification for this closeout)

- Build (strict TypeScript): EXIT 0
- Sequential unit/integration suite: **51/51**
- `verify-source-tree`: EXIT 0 (`missing: 0`, `duplicates: 0`; required paths **237**)
- `secret-scan`: EXIT 0
- `verify-container-base`: EXIT 0
- `verify-solo-governance`: EXIT 0
- `verify-published-lineage`: EXIT 0 (digest `sha256:c9a9f6f6...e564`, 5 assets)
- `verify-main-release-state`: EXIT 0 (aligned with v3.8.13)
- demo / benchmark / packed MCP / A2A / Control Plane: EXIT 0
- chromium-cdp / container compose / external topology: EXIT 0
- `workctl doctor` / `verify mission-proof.json` / three missions: EXIT 0
- Missing path: `File not found: ...`, exit 1
- Directory-as-path: `Expected a file, but found a directory: ...`, exit 1
- Malformed JSON: `Invalid JSON: ...`, exit 1
- `studio --help`: usage printed (defaults, `port=8788`)

## Distribution closeout (live, read-only)

- GitHub Release `v3.8.13` / ID `394849659`: five published assets; release reports immutable
- Tag/commit lineage matches release commit `dadef28...5b7d62`
- GHCR `3.8.13` digest matches `docs/release-lineage.json`
- Rollback image retained at `sha256:7908cc6a...9b5d0` (v3.8.1)
- No stable tags moved; no published release assets rewritten by this closeout
- `v*` tag ruleset and GitHub Release immutability are live external governance controls

## External / non-repo boundaries

- Public production host, DNS, TLS termination, and production secrets remain an infrastructure boundary
- External GitHub Advanced Security / Copilot model failures are service-side and are not worked around in WorkProof code
- Commit signatures and merge gating are governed by the active `main` ruleset (`required_signatures`); PR #170, #172, #174, and #175 satisfied that gate via SSH-signed commits before merge
- A Vercel Git integration may still be connected to this repository and can emit failed deployments when the free-tier rate limit or a static-site output-directory assumption is applied. WorkProof Runtime is a local-first runtime/CLI/Studio/Control Plane product, not a static site; do not add a fake `public/` directory to satisfy that integration. Disconnect the integration from Vercel project settings (Settings -> Git -> Connected Git Repository -> Disconnect) if failed status comments should stop.

## Operator recovery

- Current stable: pull/tag `v3.8.13` or pin image digest `sha256:c9a9f6f6...e564`
- Verified rollback: image/tag for v3.8.1 / `sha256:7908cc6a...9b5d0` (lineage in `docs/release-lineage.json`)
- Sequence invariants unchanged: GOAL -> CONTRACT -> ROUTE -> ACT -> OBSERVE -> VERIFY -> RECONCILE/RECOVER -> DELIVER -> PROVE
