# WorkProof Runtime v3.8.11

## Cross-platform runtime hardening release candidate

v3.8.11 is the current published stable release following v3.8.10. It carries the integrated portability, filesystem-security, browser-runtime, Control Plane, A2A boundary, benchmark, and verification hardening validated by the repository CI matrix.

### Included hardening

- Windows-compatible temporary-path handling for benchmark, demo, browser, and test fixtures.
- Windows Chromium/Edge executable discovery with bounded CDP startup, HTTP, and WebSocket deadlines and platform-appropriate browser teardown.
- Windows private-directory/file ACL enforcement using restrictive DACLs for the current user and SYSTEM; POSIX systems retain 0700/0600 permissions.
- CLI private-key generation now applies the same Windows ACL hardening as other private state.
- Control Plane path containment is normalized for Windows path separators/case and checks existing real paths before access.
- A2A rejects non-loopback plaintext exposure unless an explicit HTTPS public URL is configured.
- Cross-platform registry namespace and signature-security regression coverage.
- Bounded Studio scan regression coverage avoids coupling filesystem-scale acceptance to per-file ACL fixture setup.

### Verified integrated hardening

The integrated hardening candidate immediately before release metadata preparation passed:

- Linux `verify`
- Windows full compatibility suite
- Windows Chromium/CDP browser compatibility
- Windows private filesystem security acceptance
- benchmark M001-M005: 5/5 verified, falseDoneCount 0, duplicateExternalEffectCount 0, evidenceCompleteRate 1
- representative demo, CLI, Studio, registry, proof, recovery, and interoperability tests in the full suite

The subsequent `3.8.11` package/lock/release-note preparation is metadata-only and was subsequently verified by CI run #1562 after the final Windows fencing cleanup fix; the release branch was cut from the verified `main` lineage and the dedicated Release and Container workflows completed successfully.

### Post-merge release-hardening verification

After the integrated candidate was merged to `main`, the release-critical Compose smoke harness was hardened so temporary bind-mounted private data is cleaned through the container root boundary rather than by the host runner. This preserves UID/GID 10001 and 0700/0600 private-state semantics while making teardown reliable. The fix was independently verified through the protected PR CI matrix before this release branch checkpoint.

### Release evidence requirements

This file prepares the next release line; it does not claim publication.

A v3.8.11 publication is valid only after:

- the release branch is based on the final merged `main`;
- package and lock versions match `v3.8.11`;
- the complete release verification succeeds;
- container verification publishes the exact release commit and digest;
- five release assets are published and their SHA256 manifest verifies;
- the GitHub Release and tag point to the same release commit;
- the published GHCR version tag and commit-addressed image resolve to the same digest;
- published lineage is reconciled back into `main`.

### Publication verification

- GitHub Release: `v3.8.11` — published, Release ID `394667295`
- release commit: `9568cb2daffdd2f142f6112b1a6bd2c9cdbc4298`
- Release workflow #265: success
- Container workflow #262: success
- GHCR digest: `sha256:9ad675ba540959c8ada0254f6c133c5fd51eaf02319fe8032b39738f34ea5088`
- commit-addressed GHCR tag: `9568cb2daffdd2f142f6112b1a6bd2c9cdbc4298`
- five release assets were published and their SHA256 manifest was re-verified by Release workflow #265
- Production Compose restart/persistence, external topology, anonymous GHCR pull, and image provenance were verified by Container workflow #262

## Governance

The protected `main` branch uses Solo Governance: pull requests, required `verify` status checks with strict freshness, resolved review threads, deletion/non-fast-forward protection, required commit signatures, and zero bypass actors. No mandatory human approval is required for ordinary pull requests.
