# Final Audit v1.3 — Retention, GC, and Browser Acceptance Reliability

Date: 2026-09-21

## Release head

- main merge commit: `6c01f201f6cec32ab6fa34a01fe878d3f47c5b0b`
- v1.3 retention/GC merge commit: `db5c8fa296f13828ccc461c60916457b87af7168`
- browser reliability PR: #24
- v1.3 retention PR: #23

## Verification evidence

### Static and dependency gates

- source-tree audit: passed with 93 required paths.
- dependency security audit: passed with no reported vulnerabilities.
- TypeScript build: passed.
- browser binary check: passed with native Google Chrome 152.0.7977.82 in CI.

### Browser environment gate

The repository now runs a dedicated CDP preflight before acceptance tests.

Verified preflight output:
- status: verified
- browser: Chrome/152.0.7977.82
- protocol: 1.3
- dynamically negotiated DevTools port

The local browser capability keeps `chromium` as the default for self-hosted use while supporting `WORKPROOF_BROWSER_BINARY` for environments that provide another compatible browser binary.

### Retention gate

The dedicated retention suite passed 9/9:
- deterministic retention classes
- dry-run candidate planning
- pin/unpin reachability
- shared-artifact reachability
- corrupt-content protection
- journaled execution
- repair/recovery
- symlink boundary
- namespace-conservative collection

### Full verification suite

The sequential diagnostic runner passed 23/23 test files.

The browser acceptance test passed on native Chrome. Registry/auth/trust synchronization, proof signature, trust policy, vault, retention, runtime, GitHub integration, publication, discovery, and two-system reconciliation suites all passed.

### Product acceptance

- Work Completion Benchmark V2: passed.
- Demo: verified.
- CLI proof verification: verified.
- CLI mission execution: verified.
- Live GitHub repository smoke: verified.

## Faults found and corrected

1. CI initially failed because Chromium Snap did not reliably expose a usable CDP endpoint on the Ubuntu runner.
2. CI initially exposed an intermittent trust-sync test mutation that could accidentally produce no signature change.
3. CI initially exposed strict-TypeScript issues in CLI regression fixtures.
4. Documentation briefly reported 94 required source paths while the authoritative source audit contained 93; the manifest was corrected.
5. Browser lifecycle was hardened with negotiated CDP ports, retry, unique profiles, configurable binary selection, and process-group cleanup.

These were corrected and re-verified rather than being suppressed with broader timeouts or weakened assertions.

## Safety and trust boundaries

- A tool receipt is not final outcome proof.
- SHA-256 proof integrity is tamper-evident metadata, not a signature.
- Ed25519 authenticates a proof under its embedded public key; organizational trust remains policy-controlled.
- Browser acceptance is constrained by an explicit allowed-target policy.
- GitHub write idempotency remains reconciliation-based rather than an atomic exactly-once distributed primitive.
- v1.3 vault GC does not destructively delete registry trust-snapshot content.

## Release result

v1.3 retention/reachability/GC and the CI browser-reliability correction are verified on merged `main`.

Next work should be treated as a new milestone, not as unfinished v1.3 scope.
