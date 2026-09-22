# Security Policy

## Scope

WorkProof Runtime can execute digital work and interact with external systems through capabilities. Security-sensitive capabilities must be explicitly permissioned.

## Reporting

Do not disclose active vulnerabilities in public issues.

Use GitHub's private vulnerability reporting / Security Advisories interface for this repository when it is enabled. The connected repository settings are maintained outside this source tree; the repository currently documents the reporting path but does not claim that the GitHub-side feature is enabled.

When private reporting is unavailable, contact the project owner through a non-public channel before disclosure.

## Design principles

- Least privilege for capabilities.
- Explicit risk ceilings.
- Human approval for policy-gated actions.
- No secrets in source, artifacts, or proof bundles.
- Reconciliation before retrying ambiguous external effects.
- Audit events for external side effects.
