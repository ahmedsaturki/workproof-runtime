# CodeQL Data-Flow Boundaries

## Scope

This document records three intentionally isolated product-boundary data-flow sinks in the v3.8.12/v3.8.13 security hardening lines.

The repository keeps the full JavaScript/TypeScript `security-extended` CodeQL suite enabled for application code. Only the dedicated sink modules are excluded by narrowly scoped repository rules or alert suppression because their purpose is to persist or transport validated/reconstructed artifacts after repository-specific validation that the generic CodeQL taint model does not recognize as a sanitizer.

The exclusion is limited to:

- `packages/evidence/src/trust-snapshot-writer.ts`
- `packages/packs/src/discovery-artifact-writer.ts`
- `packages/registry/src/trust-transport.ts` — narrow CodeQL `paths-ignore` exclusion for the dedicated trust-snapshot POST sink after cryptographic validation and field projection

No query is excluded globally, and the surrounding CLI, registry, discovery, and verification code remains in the CodeQL corpus.

## Registry trust snapshot pull

`packages/cli/src/index.ts` receives a trust snapshot from the authenticated registry.

Before persistence, `serializeTrustPolicySnapshot()`:

- validates snapshot version and epoch;
- validates the complete trust policy schema;
- recomputes and compares the canonical SHA-256 digest;
- requires and verifies the Ed25519 signature;
- reconstructs a fresh output object from an explicit allowlist of trusted fields;
- serializes only that reconstructed object.

The filesystem sink is isolated in `packages/evidence/src/trust-snapshot-writer.ts`, which receives the validated `TrustPolicySnapshot` and writes only `serializeTrustPolicySnapshot(snapshot)` output.

Regression coverage exists in the trust/registry test suites, the CLI registry smoke path, and `test/remote-artifact-security.test.ts`.

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

## Registry trust snapshot publish transport

`packages/cli/src/index.ts` reads a local trust snapshot only for the explicit `registry-trust-publish` command. Before network transport, `publishTrustSnapshotToRegistry()` validates the snapshot digest and Ed25519 signature and then reconstructs a fresh transport object from the bounded trust fields (`version`, `epoch`, `policy`, `digest`, and optional signature).

The resulting transport is sent through the dedicated `packages/registry/src/trust-transport.ts` sink. The `js/file-access-to-http` suppression is attached only to that one `body: JSON.stringify(transport)` line. The generic registry request function remains unsuppressed, so other file-derived HTTP flows remain visible to CodeQL.

## Why CodeQL is suppressed

CodeQL's `js/http-to-file-access` query is a generic taint/data-flow detector for network-controlled data reaching filesystem writes. The query is valuable and remains enabled globally.

These modules are intentionally narrow local artifact/transport boundaries. Their safety depends on repository-specific validators/serializers that CodeQL's generic data-flow model does not recognize as complete sanitizers.

The three path exclusions are reviewed product-boundary exceptions rather than a query-wide disable. `test/remote-artifact-security.test.ts` constrains the exception to the two intended application-to-writer flows and verifies that the surrounding application modules do not contain raw filesystem sinks.

Any future change that moves a raw HTTP response, arbitrary fields, executable content, or unvalidated data directly into any of these sinks must remove the exception and re-open the security review.

Reviewed: 2026-09-23
Release lines: v3.8.12 and v3.8.13 candidate
