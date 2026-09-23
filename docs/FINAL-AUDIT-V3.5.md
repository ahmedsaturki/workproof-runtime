# Final Audit v3.5 -- Product Hardening and Launch Readiness

Date: 2026-09-23

## Release identity

- Stable release: **v3.8.13**
- Release commit: `dadef28ce8fbd299201a228673f1c2737c5b7d62`
- Main checkout: `debcb194247632222b62bc7289558f71fce56674` (`debcb19`)
- Package version: `3.8.13`
- GitHub Release ID: `394849659` (5 assets)
- GHCR image: `ghcr.io/ahmedsaturki/workproof-runtime:3.8.13`
- GHCR digest: `sha256:c9a9f6f6f0fb111dc64d42b1a2746091f14366c389c1af6eb3b0683c6e3fe564`
- Verified rollback release: **v3.8.1** / `sha256:7908cc6a4473495b7b5c51f1a0527815f0a8ff0c6d9eaf20ebf1ddfb0479b5d0`
- Immediately preceding stable: v3.8.12 (historical; not the verified rollback target)
- Working tree (this closeout): local, uncommitted changes only -- no tag moves, no rewrite of published releases

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
- CLI error UX (friendly missing-file / malformed-JSON messages, usage, `--help`/`--version`)
- Studio CLI surface (`workproof-studio --help` / `--version`)

## Gaps found in this audit pass and fixes applied

| Gap | Fix | Verification |
| --- | --- | --- |
| `.gitignore` / `.dockerignore` could allow runtime secret paths to be tracked or packed | Runtime secret path exclusions added | `secret-scan` EXIT 0; source-tree EXIT 0 |
| `scripts/verify-published-lineage.js` used a shell-dependent curl style (Windows-hostile) | Rewritten to Node `fetch` | `verify-published-lineage` EXIT 0; digest matches v3.8.13 |
| `scripts/external-topology-smoke.js` lacked Windows tool resolution and `NULL_DEVICE` portability | `resolveTool` / `WINDOWS_TOOL_CANDIDATES` / `sleepSeconds` / null-device handling | external topology EXIT 0 (all required flags true) |
| Docs claimed a generic "current stable" vs rollback without distinguishing v3.8.12 vs v3.8.1 | README + `docs/PRODUCT-READINESS-V1.md` wording split: immediate predecessor vs verified rollback | README lines 7/154; readiness doc rollback line |
| Release-state allowlist incomplete for this closeout's post-release edits | `allowedPostReleaseFiles` extended | `verify-main-release-state` EXIT 0 |
| `npm test` parallel EPERM on Windows temp dirs | `removeTempDir()` retry in `test/persistent-leases.test.ts` | sequential suite is the gate; parallel hardened |
| CLI `verify` / `summarize` / `run` surfaced raw stack traces and `String(error)` messages | `formatCliError` + `readJsonFile` in `packages/cli/src/index.ts` (ENOENT/EISDIR -> `File not found: <path>`; SyntaxError -> `Invalid JSON: ...`; no stacks) | E1/E2/S1 status 1 + friendly stderr; malformed JSON -> `Invalid JSON:`; ~31 call sites |
| Studio had no help/version surface | `studioUsage()`; `--help`/`-h`/`help` and `--version`/`-v`/`version` in `apps/studio.ts` | `studio --help` prints usage (defaults, port 8788), usage for unknown command (`workctl`) |
| Closeout doc not yet registered | This file added to `scripts/verify-source-tree.js` required list | source-tree required count 236 -> 237 after registration |

Regression coverage added in `test/product-smoke.test.ts` (friendly missing-file proof, malformed JSON, missing mission, studio `--help`) and `test/release-metadata.test.ts` (allowlist entries asserted).

## Status

**v3.8.13 is fully verified for local product audit, hardening closeout, and operational usability. Distribution (GitHub Release + GHCR) was verified unauthenticated against the live publication. Uncommitted working-tree changes remain until an explicit commit/PR request.**

## Recorded outcome (this pass)

- Build (strict TypeScript): EXIT 0
- Sequential unit/integration suite: **51/51** (see final run evidence below)
- `verify-source-tree`: EXIT 0 (`missing: 0`, `duplicates: 0`)
- `secret-scan`: EXIT 0
- `verify-container-base`: EXIT 0
- `verify-solo-governance`: EXIT 0
- `verify-published-lineage`: EXIT 0 (digest `sha256:c9a9f6f6...e564`, 5 assets)
- `verify-main-release-state`: EXIT 0 (image, digests, asset count aligned with v3.8.13)
- demo: EXIT 0
- benchmark: EXIT 0
- packed MCP / A2A / Control Plane: EXIT 0 / EXIT 0 / EXIT 0
- chromium-cdp: EXIT 0
- container compose: EXIT 0
- external topology: EXIT 0 (TLS, auth, secretNonLeakage, persistence, backupRestore, rollback, denyByDefault true)
- `workctl doctor`: EXIT 0 (ready)
- `workctl verify mission-proof.json`: EXIT 0
- Missions: research-local / research-transform-chain / research-a2a-ready: EXIT 0 / 0 / 0
- Missing proof file: `File not found: ...\definitely-missing-proof.json`, exit 1
- Malformed proof JSON: `Invalid JSON: ...`, exit 1
- `studio --help`: usage printed, defaults and `port=8788` visible
- Unknown CLI command: `workctl` usage printed (exit 1; `Select-Object` pipe can show `-1` for `$LASTEXITCODE` -- direct runs confirm non-zero)

## Distribution closeout (live, read-only)

- GitHub Release `v3.8.13` / ID `394849659`: 5 assets (`operational-reality-core-3.8.13.tgz`, `RELEASE-MANIFEST.txt`, `SHA256SUMS.txt`, `workproof-benchmark-v3.8.13.json`, `workproof-runtime-v3.8.13.tar.gz`)
- Tag/commit lineage matches release commit `dadef28...5b7d62`
- GHCR `3.8.13` digest verified against `docs/release-lineage.json` and the published image manifest
- Rollback image retained at `sha256:7908cc6a...9b5d0` (v3.8.1)
- No stable tags moved; no published release assets rewritten

## External / non-repo boundaries (not claimed as completed here)

- Public production host, DNS, TLS termination, and production secrets remain an infrastructure boundary
- `gh` CLI authentication was unavailable (401); GitHub/GHCR verification used unauthenticated HTTPS only
- No commit, PR, tag push, or release mutation was performed in this pass

## Operator recovery

- Current stable: pull/tag `v3.8.13` or pin image digest `sha256:c9a9f6f6...e564`
- Verified rollback: image/tag for v3.8.1 / `sha256:7908cc6a...9b5d0` (lineage in `docs/release-lineage.json`)
- Sequence invariants unchanged: GOAL -> CONTRACT -> ROUTE -> ACT -> OBSERVE -> VERIFY -> RECONCILE/RECOVER -> DELIVER -> PROVE; receipt  proof; no blind retry of failed external effects
