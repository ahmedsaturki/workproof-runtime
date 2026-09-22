# GitHub Governance Runbook

## Verified repository state

The repository is public, the default branch is `main`, GitHub reports `main` as protected, and the active repository ruleset is `main` (ruleset ID `23845160`).

The current ruleset targets `refs/heads/main` and has bypass actors set to none.

## Active protection controls

The currently observed `main` ruleset enforces:

- pull requests before merging
- required CI check: `verify`
- conversation/thread resolution
- protection against branch deletion
- protection against non-fast-forward updates
- code-owner review flag enabled
- merge methods limited to merge, squash, and rebase
- no configured bypass actors

The ruleset currently reports `required_approving_review_count: 0`.

GitHub documents that the code-owner review setting has no effect when the ruleset requires zero approvals. Therefore, the repository is protected against direct deletion/non-fast-forward updates and requires the `verify` check through a pull request, but **code-owner approval is not currently an effective merge gate**.

The current required status check uses the GitHub Actions `verify` check, and its source is pinned to the GitHub Actions integration configured by the ruleset.

## Governance hardening still available

To make code-owner approval an actual merge gate, set `required approving reviews` to at least `1` and keep `Require review from Code Owners` enabled. GitHub notes that the reviewers must have write access, and a repository-owned CODEOWNERS rule can then require an eligible code owner to approve the change. In a single-owner repository this may require adding another eligible reviewer/collaborator; otherwise the owner cannot use the rule to self-approve their own pull request.

For stronger freshness/review discipline, the repository can additionally enable dismissal of stale approvals after new pushes, require approval of the most recent push by someone other than the pusher, and use strict required-status-check freshness so the pull request must be up to date with `main`.

## CODEOWNERS

`.github/CODEOWNERS` currently assigns the repository to `@ahmedsaturki` and is itself covered by that ownership declaration.

## Verification

After any governance change, verify all of the following from GitHub:

1. `main` remains protected.
2. The `main` ruleset is active and targets `refs/heads/main`.
3. `verify` is required and must pass.
4. Force-push/non-fast-forward and branch deletion are blocked.
5. Pull requests and conversation resolution remain required.
6. Code-owner review is actually enforced by using at least one required approving review when that policy is intended.

Branch protection/rulesets are GitHub repository controls around source delivery. They do not replace WorkProof Runtime's runtime authorization, risk, effect, verification, reconciliation, recovery, or proof boundaries.
