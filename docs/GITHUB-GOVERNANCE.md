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

## Migration state

The repository is currently in the migration window: the live GitHub ruleset has not yet been switched to the Solo settings below. Until that Settings change is made, the new governance verifier is expected to fail closed rather than pretending the migration is complete.

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
- merge methods limited to merge, squash, and rebase.

GitHub exposes the review and ruleset controls used here, including required approval count, Code Owner review, latest-push approval, stale-review dismissal, thread resolution, and status-check requirements.

## Governance drift verification

The repository now includes `scripts/verify-solo-governance.js`.

The required `verify` CI job executes this script against the live GitHub ruleset and fails closed when the Solo Governance contract drifts. It checks the actual active ruleset rather than relying only on documentation.

This prevents a later GitHub Settings change from silently reintroducing an approval gate, bypass actor, missing `verify`, non-strict checks, or loss of branch protections.

The ruleset is edited in GitHub under **Settings → Rulesets → main → Edit → Save changes**. GitHub documents that users with repository admin access can edit repository rulesets. citeturn306351search1turn306351search5

## CODEOWNERS

`.github/CODEOWNERS` currently assigns repository ownership to:

```
* @ahmedsaturki
```

Under Solo Governance this remains useful as ownership metadata and for future multi-maintainer evolution, but it is not itself a merge approval requirement because Code Owner review is disabled in the active Solo ruleset.

## Automated review and security evidence

The repository intentionally layers automated controls rather than pretending they are human reviewers:

- CodeQL analyzes JavaScript/TypeScript and GitHub Actions;
- Dependency Review checks dependency changes when GitHub Dependency Graph is available;
- OSSF Scorecard analyzes repository supply-chain practices;
- Dependabot manages npm and GitHub Actions updates;
- secret scanning is enforced in CI;
- Debricked vulnerability analysis is already integrated;
- the main CI verifies Linux and Windows compatibility plus browser/CDP and private-filesystem security.

A Marketplace review application may add additional comments or analysis, but its output must remain advisory unless GitHub itself records an eligible approval.

## Release and tag integrity

The published `v3.8.10` tag currently resolves to the verified release commit `9daac7a926ce1631ac708a6c234379d622c56c19`, and Release workflow #261 verified the published assets and SHA256 manifest.

GitHub currently reports that release as non-immutable. The release workflow therefore provides publication-time digest/lineage verification, while GitHub-side release/tag immutability is treated as a separate governance hardening layer.

For future release integrity, enable GitHub release immutability where available and protect release tags (for example `v*`) against deletion and force-update.

## Verification contract

After any governance change, GitHub state must be re-checked and `verify` must pass against the live ruleset.

The repository must not claim Solo Governance while any of the following remains true:

- mandatory ordinary approvals are greater than zero;
- Code Owner approval is required;
- latest-push approval is required;
- stale-review dismissal is unexpectedly enabled;
- a bypass actor is configured;
- `verify` is not required with strict freshness;
- branch deletion or non-fast-forward protection is removed.

GitHub rulesets are an external repository control. They do not replace WorkProof Runtime's execution authorization, effect handling, verification, reconciliation, recovery, or proof model.
