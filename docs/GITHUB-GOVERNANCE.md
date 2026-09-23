# GitHub Governance Runbook

## Verified repository state

The repository is public, the default branch is `main`, GitHub reports `main` as protected, and the active repository ruleset is `main` (ruleset ID `23845160`).

The current ruleset targets `refs/heads/main` and has bypass actors set to none.

## Active protection controls

The currently observed `main` ruleset enforces:

- pull requests before merging
- required CI check: `verify`
- strict required-status-check freshness
- conversation/thread resolution
- protection against branch deletion
- protection against non-fast-forward updates
- one required approving review
- dismissal of stale approvals after new pushes
- approval of the most recent push
- review from Code Owners
- additional approval for unattributed changes
- merge methods limited to merge, squash, and rebase
- no configured bypass actors

The active ruleset reports:

- `required_approving_review_count: 1`
- `require_code_owner_review: true`
- `dismiss_stale_reviews_on_push: true`
- `require_last_push_approval: true`
- `required_review_thread_resolution: true`
- `require_extra_approval_for_unattributed_changes: true`
- required status check: `verify`
- `strict_required_status_checks_policy: true`
- `current_user_can_bypass: never`

This means the Code Owner requirement is now an effective approval gate rather than a flag with zero required approvals.

## CODEOWNERS

`.github/CODEOWNERS` currently assigns the repository to `@ahmedsaturki`:

```
* @ahmedsaturki
```

Because the active ruleset requires one approval and the current Code Owner is also the repository owner/author for repository-only changes, a pull request authored by that same account cannot self-satisfy the required approval. A second eligible reviewer with write access must be available when a pull request is intended to merge under this policy.

Do not weaken the review rule merely to make a solo-authored pull request mergeable.

## Verification

After any governance change, verify all of the following from GitHub:

1. `main` remains protected.
2. The `main` ruleset is active and targets `refs/heads/main`.
3. `verify` is required and must pass.
4. Required status checks must be current with `main`.
5. Force-push/non-fast-forward and branch deletion are blocked.
6. Pull requests and conversation resolution remain required.
7. One approval is required and stale approvals are dismissed on new pushes.
8. The most recent push requires approval from an eligible reviewer other than the pusher.
9. Code-owner review is required.
10. No bypass actors are configured.

## Release and tag integrity

The published `v3.8.10` tag currently resolves to the verified release commit `9daac7a926ce1631ac708a6c234379d622c56c19`, and Release workflow #261 verified tag/commit lineage plus the five published assets and their SHA256 manifest.

GitHub's current Release API reports `immutable: false` for `v3.8.10`. Therefore the release pipeline's digest/lineage checks provide publication-time integrity evidence, but GitHub-level **immutable release enforcement is not retroactive for this already-published release**.

For future release integrity, enable GitHub release immutability in repository/organization settings and add an active tag ruleset covering release tags (for example, `v*`) with tag deletion and force-update protection. GitHub documents that immutable releases lock the associated tag and release assets after publication, while tag rulesets can separately restrict updates/deletions. This is a supply-chain hardening layer above the release workflow.

Branch protection/rulesets are GitHub repository controls around source delivery. They do not replace WorkProof Runtime's runtime authorization, risk, effect, verification, reconciliation, recovery, or proof boundaries.
