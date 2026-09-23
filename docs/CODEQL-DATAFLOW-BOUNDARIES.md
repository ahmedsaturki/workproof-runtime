# CodeQL Data-Flow Boundaries

## Scope

This document records the two intentionally suppressed `js/http-to-file-access` findings in the v3.8.12 security hardening line.

The repository keeps the full JavaScript/TypeScript `security-extended` CodeQL suite enabled. The two current product-boundary findings are suppressed only at their exact validated filesystem sink statements with `// lgtm[js/http-to-file-access]`. This preserves the query everywhere else. A repository-side regression contract also locks the two intended validated artifact flows.

## Registry trust snapshot pull

`packages/cli/src/index.ts` receives a trust snapshot from the authenticated registry.

Before persistence, `serializeTrustPolicySnapshot()`:

- validates snapshot version and epoch;
- validates the complete trust policy schema;
- recomputes and compares the canonical SHA-256 digest;
- requires and verifies the Ed25519 signature;
- reconstructs a fresh output object from an explicit allowlist of trusted fields;
- serializes only that reconstructed object.

The sink therefore does not persist the raw HTTP response. It persists a schema-validated, integrity-checked, signature-verified representation.

Regression coverage exists in the trust/registry test suites and the CLI registry smoke path.

## HTTP discovery artifact

`packages/packs/src/web-discovery-pack.ts` receives search results over HTTP.

Before persistence, `uniqueDiscoveryRecords()`:

- rejects non-object records;
- requires exactly the supported primitive fields to have the expected types;
- trims and bounds field lengths;
- accepts only `http:` and `https:` website URLs;
- reconstructs each record as `{ name, website, source }`, discarding all unknown fields;
- deduplicates records by normalized website;
- writes through an exclusive temporary file followed by atomic rename.

Regression coverage explicitly sends malformed records, a `file:` URL, incorrect field types, and an injected field and verifies that only the two valid allowlisted records are materialized.

## Why CodeQL is suppressed

CodeQL's `js/http-to-file-access` query is a generic taint/data-flow detector for network-controlled data reaching filesystem writes. The query is valuable and remains enabled globally.

These two paths are intentionally local artifact materialization boundaries. Their safety depends on repository-specific validators/serializers that CodeQL's generic data-flow model does not recognize as complete sanitizers.

The suppressions record reviewed product-boundary false positives at the exact sinks rather than disabling the CodeQL query. The regression test is the local control that constrains these exceptions to the intended two validated artifact flows.

Any future change that moves a raw HTTP response, arbitrary fields, executable content, or unvalidated data directly into either sink must remove the suppression and re-open the security review.

Reviewed: 2026-09-23
Release line: v3.8.12
