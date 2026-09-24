# GitHub Governance Runbook

## Repository governance profiles

WorkProof Runtime is maintained as a **single-maintainer repository**. The repository uses GitHub rulesets as a source-delivery control and keeps the runtime's own authorization, risk, verification, reconciliation, recovery, and proof boundaries independent of GitHub governance.

The repository's supported operating profile is **Solo Governance**:

- changes to `main` must still arrive through a pull request;
- `verify` remains a required, strict-freshness status check;
- review conversations must be resolved;
- branch deletion and non-fast-forward updates remain blocked;
- no ruleset bypass actors are configured;
- no human approval is mandatory for an ordinary pull request;
- Code Owners remain documented ownership metadata, not an approval gate;
- latest-push approval is not required because there may be no second maintainer;
- the unattributed-Copilot extra-approval safety gate remains enabled as a separate exceptional control.

This profile is deliberately explicit: automated scanners and review bots can provide evidence and comments, but they are not represented as human approvals.

## Solo Governance status

The Solo Governance migration is complete. The live `main` ruleset and the protected `v*` release-tag ruleset were verified after the GitHub Settings changes and now match the repository's single-maintainer operating profile.

## Active main ruleset

The active repository ruleset is named `main` (ruleset ID `23845160`) and targets `refs/heads/main`.

The intended Solo Governance settings are:

- pull requests required before merge;
- `required_approving_review_count: 0`;
- `dismiss_stale_reviews_on_push: false`;
- `require_code_owner_review: false`;
- `require_last_push_approval: false`;
- `required_review_thread_resolution: true`;
- `require_extra_approval_for_unattributed_changes: true`;
- required status check: `verify`;
- `strict_required_status_checks_policy: true`;
- deletion protection enabled;
- non-fast-forward protection enabled;
- no bypass actors;
- merge methods limited to merge, squash, and rebase;
- Copilot code review on push remains active;
- required commit signatures remain active.

GitHub exposes the review and ruleset controls used here, including required approval count, Code Owner review, latest-push approval, stale-review dismissal, thread resolution, and status-check requirements.

## Release tag ruleset

The active repository release-tag ruleset is named `v*` (ruleset ID `23924353`) and targets `refs/tags/v*`.

It enforces:

- tag deletion protection;
- non-fast-forward protection;
- update protection;
- no bypass actors;
- current user cannot bypass.

Tag creation is intentionally not restricted so the release workflow can create a new version tag; the ruleset protects an existing release tag from mutation or deletion.

## Governance drift verification

The repository now includes `scripts/verify-solo-governance.js`.

The required `verify` CI job executes this script against both live GitHub rulesets and fails closed when either governance contract drifts. It checks the actual active rulesets rather than relying only on documentation.

This prevents a later GitHub Settings change from silently reintroducing an approval gate, bypass actor, missing `verify`, non-strict checks, loss of main protections, or loss of release-tag protections.

The ruleset is edited in GitHub under **Settings → Rulesets → main → Edit → Save changes**. GitHub documents that users with repository admin access can edit repository rulesets.

## CODEOWNERS

`.github/CODEOWNERS` currently assigns repository ownership to:

```
* @ahmedsaturki
```

Under Solo Governance this remains useful as ownership metadata and for future multi-maintainer evolution, but it is not itself a merge approval requirement because Code Owner review is disabled in the active Solo ruleset.

## Automated review and security evidence

The repository intentionally layers automated controls rather than pretending they are human reviewers:

- CodeQL analyzes JavaScript/TypeScript and GitHub Actions;
- Dependency Review checks dependency changes; the repository Dependency Graph is enabled and the v3.8.13 release branch passed Dependency Review;
- OSSF Scorecard analyzes repository supply-chain practices;
- Dependabot manages npm and GitHub Actions updates;
- secret scanning is enforced in CI;
- Debricked vulnerability analysis is already integrated;
- the main CI verifies Linux and Windows compatibility plus browser/CDP and private-filesystem security.

A Marketplace review application may add additional comments or analysis, but its output must remain advisory unless GitHub itself records an eligible approval.

## Release and tag integrity

The published `v3.8.13` tag resolves to the verified release commit `dadef28ce8fbd299201a228673f1c2737c5b7d62`. Release workflow #305 verified the five published assets and SHA256 manifest; Container workflow #302 verified the matching GHCR image and digest.

GitHub currently reports the historical `v3.8.13` release as non-immutable. GitHub release immutability applies to future releases, so this status does not retroactively change the already-published release. The release workflow therefore continues to provide publication-time digest/lineage verification.

The `v*` release-tag ruleset is now active and protects future version tags against deletion, non-fast-forward updates, and ordinary updates. The published `v3.8.13` GitHub Release is also immutable. The governance verifier checks the live release state and fails closed if the current stable release loses immutability or its target drifts from recorded release lineage.

## Verification contract

After any governance change, GitHub state must be re-checked and `verify` must pass against the live ruleset.

The repository must not claim Solo Governance while any of the following remains true:

- mandatory ordinary approvals are greater than zero;
- Code Owner approval is required;
- latest-push approval is required;
- stale-review dismissal is unexpectedly enabled;
- a bypass actor is configured;
- `verify` is not required with strict freshness;
- branch deletion or non-fast-forward protection is removed;
- release-tag deletion, non-fast-forward, or update protection is removed for `v*`.

GitHub rulesets are an external repository control. They do not replace WorkProof Runtime's execution authorization, effect handling, verification, reconciliation, recovery, or proof model.
