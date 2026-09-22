# GitHub Governance Runbook

## Verified repository state

As of the v3.8.10 closeout review, the repository is public, the default branch is `main`, and GitHub reports `main` as unprotected with no repository rulesets.

This document is intentionally factual: the source tree cannot create GitHub-side branch protection by itself.

## Required protection for production-grade maintenance

Protect `main` with a repository branch protection rule or ruleset. At minimum, require the successful `verify` CI check before merging, require pull requests, and prevent force-push and deletion of `main`. GitHub supports requiring status checks, pull-request reviews, conversation resolution, signed commits, linear history, and restrictions on force pushes/deletions through branch protection/rulesets.

For this repository, the primary required check is the GitHub Actions job named `verify` in `.github/workflows/ci.yml`.

The recommended protected-branch baseline is:

- target branch: `main`
- require pull requests before merging
- require at least one approving review when collaboration warrants it
- require the `verify` status check
- require the branch to be up to date before merging when strict freshness is desired
- require conversation resolution
- block force pushes
- block branch deletion
- prevent bypass where the repository's ownership/governance model permits it

## Why this is separate from WorkProof Runtime

Branch protection is a GitHub repository control around source delivery. It does not replace WorkProof Runtime's runtime authorization, risk, effect, verification, reconciliation, recovery, or proof boundaries.

## Verification

After enabling protection, confirm GitHub reports `main` as protected and that a pull request cannot merge until the required `verify` check passes.

The repository's current CI and release pipelines already provide the execution-side evidence; the remaining action is GitHub-side repository configuration.
