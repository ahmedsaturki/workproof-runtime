# WorkProof Runtime v3.8.11

## Cross-platform runtime hardening release candidate

v3.8.11 is the next release candidate after v3.8.10. It carries the integrated portability, filesystem-security, browser-runtime, Control Plane, A2A boundary, benchmark, and verification hardening validated by the repository CI matrix.

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

The subsequent `3.8.11` package/lock/release-note preparation is metadata-only and is was subsequently verified by CI run #1562 after the final Windows fencing cleanup fix; it is not treated as published until the release branch is cut from the final merged `main` and the dedicated release workflow completes.

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

### Governance

The protected `main` branch requires an independent approval and current required status checks. No branch-protection bypass is part of this release candidate.
