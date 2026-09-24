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
- Dependency Review checks dependency changes; the repository Dependency Graph is enabled and the v3.8.14 release branch passed Dependency Review;
- OSSF Scorecard analyzes repository supply-chain practices;
- Dependabot manages npm and GitHub Actions updates;
- secret scanning is enforced in CI;
- Debricked vulnerability analysis is already integrated;
- the main CI verifies Linux and Windows compatibility plus browser/CDP and private-filesystem security.

A Marketplace review application may add additional comments or analysis, but its output must remain advisory unless GitHub itself records an eligible approval.

## Release and tag integrity

The published `v3.8.14` tag resolves to the verified release commit `8fcb6cfca67d865ce56533ad56e1a508d997e98a`. Release workflow #307 verified the five published assets and SHA256 manifest; Container workflow #304 verified the matching GHCR image and digest.

The published `v3.8.14` GitHub Release is immutable. The `v*` release-tag ruleset separately protects version tags against deletion, non-fast-forward updates, and ordinary updates. The governance verifier checks both controls against live GitHub state and fails closed if the current stable release loses immutability or its target drifts from recorded release lineage.

The `v*` release-tag ruleset is active and protects future version tags against deletion, non-fast-forward updates, and ordinary updates. The published `v3.8.14` GitHub Release is immutable.

The release workflow uses draft-first publication for future immutable releases: it creates a draft, attaches the complete five-asset distribution, validates the exact asset set while the release is still mutable, and only then publishes. Once published, reruns refuse to rewrite immutable release assets. This path landed in PR #175 (`ac99bb127fa621aa48ff903535075224949e4135`) under SSH-signed commits.

Closeout documentation coherence landed in PR #176 (`f95a8c097e9fd5f93f479289b3b8b4f04721f028`), the Control Plane terminal-idempotency hardening landed in PR #177 (`5f0830e5c1b179b66f7fd0d8a09904147aa57ce6`), PR #178 (`cb7f1f40205126da54a8364524e2aa8aa3fe51a6`) recorded that closeout plus packed startup-timeout hardening, and PR #179 (`1b22c91a9f7dd51309fdde6eb4bdcbef0356c5d8`) recorded the #178 closeout and signed-merge lineage; all merges kept required signatures, required `verify` freshness, and review-thread resolution. Published `v3.8.13` release artifacts were not rewritten by any of these changes. PR #180 (`84062634503f9b15937feaee6b3c21e288cd2cf3`) recorded the #179 closeout, and PR #181 (head `92e3fb1959cff5f479e0abab429ef5fabc271978`, merged as `8fcb6cfca67d865ce56533ad56e1a508d997e98a`) prepared and published the immutable `v3.8.14` release without rewriting any prior published release.

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
