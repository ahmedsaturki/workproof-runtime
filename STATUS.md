# WorkProof Runtime Status

Date: 2026-09-22

## Main verified baseline

The current stable release line is v3.8.1; main CI is required to verify every post-release reconciliation.

Main contains the v3.4 executable benchmark, restart/resume safety, portable proof, explicit proof compatibility, operator guidance, packaged operator docs/examples, multi-capability execution, external-topology validation, and distribution hardening.

## Current stable v3.8.1

- package version: `3.8.1`
- stable release tag: `v3.8.1`
- stable release commit: `f8af30bf69391db22863c432df5c452a73ebaa05`
- GitHub Release ID: `393805901`
- Release workflow #192: success
- Container workflow #189: success
- GHCR image: `ghcr.io/ahmedsaturki/workproof-runtime:3.8.1`
- GHCR digest: `sha256:7908cc6a4473495b7b5c51f1a0527815f0a8ff0c6d9eaf20ebf1ddfb0479b5d0`
- immutable image tag: `f8af30bf69391db22863c432df5c452a73ebaa05`
- prior stable rollback: `v3.8.0` / `sha256:f057384da7a5789aa71ffcec0ea4589ec8c10e7a9e1b37f8cabcabd303d38fcc`
- Control Plane execution-policy and terminal-idempotency safety fixes: merged in PR #102

## Main verification basis

- package version: `3.8.1`
- pre-network-hardening main state: `45dab56134d848df61eafb8b8a022e3a0609f617`
- main CI #1278: success on that state
- stable release source commit: `f8af30bf69391db22863c432df5c452a73ebaa05`
- post-release hardening PR #97: merged; reproducible `npm ci` install tree
- post-release hardening PR #98: merged; release metadata/license/source-manifest reconciliation
- repository hardening PR #101: pins workflow actions to immutable commits, adds CODEOWNERS coverage, reconciles the source manifest, and clarifies security reporting
- Control Plane safety PR #102: merged; execution policy, non-loopback auth boundary, terminal idempotency failure replay

The v3.8.0 release remains retained as rollback provenance. The current main line includes the v3.8.1 safety release plus network-boundary hardening.

## Current verified release

- version: `3.8.1`
- tag: `v3.8.1`
- release commit: `f8af30bf69391db22863c432df5c452a73ebaa05`
- GitHub Release ID: 393805901
- release verification run #192: success
- Container verification run #189: success
- GHCR image: `ghcr.io/ahmedsaturki/workproof-runtime:3.8.1`
- GHCR digest: `sha256:7908cc6a4473495b7b5c51f1a0527815f0a8ff0c6d9eaf20ebf1ddfb0479b5d0`
- immutable image tag: `f8af30bf69391db22863c432df5c452a73ebaa05`
- five release assets published and verified

## Current main closeout

- PR #103: merged; v3.8.1 stable distribution reconciliation
- main CI #1278: success on the reconciled v3.8.1 main state
- subsequent network-boundary hardening is prepared separately and must receive its own CI/release verification before promotion

## Product gates


- [x] local WorkProof Studio
- [x] packaged `workctl`
- [x] Work Object restart/resume
- [x] idempotency operation/input drift protection
- [x] portable proof export/verify/import
- [x] versioned proof compatibility
- [x] operator guidance UX for failure/ambiguity/recovery/verification
- [x] operational overview and attention summary
- [x] production Compose restart/persistence smoke
- [x] exact release-commit Docker build context
- [x] package includes operator docs and representative mission examples
- [x] representative multi-capability mission
- [x] Studio capability-chain visibility
- [x] disposable external-topology TLS/auth/backup/restore/rollback smoke
- [x] authenticated capability inventory and Studio registry visibility
- [x] packed control-plane product smoke

## Benchmark

M001-M005: 5/5 verified.

- verifiedCompletionRate: 1.0
- falseDoneCount: 0
- duplicateExternalEffectCount: 0
- ambiguousOutcomeResolvedCount: 1
- capabilitySubstitutionCount: 1
- evidenceCompleteRate: 1.0
- humanInterventionCount: 0

## Distribution and operations

- [x] reproducible source distribution
- [x] npm-compatible package artifact
- [x] GitHub Release publication and post-publication verification
- [x] GHCR publication and anonymous pull verification
- [x] pinned localhost production compose
- [x] production deployment runbook
- [x] disposable external-topology smoke with TLS/auth/backup/restore/rollback
- [external] public host/DNS/TLS/auth/secrets provisioning is intentionally outside the repository's provisioned resources

The disposable topology gate verifies TLS, authentication, secret non-leakage, persistent state, backup/restore, rollback to a previous immutable release, and deny-by-default network exposure. The release smoke additionally binds the published tag to the verified immutable digest. Public infrastructure remains a separate external resource; the public-host portion is deployment provisioning, not a hidden runtime dependency.

## Verification rule

A capability receipt is not independent proof. Work is verified only when independent evidence satisfies the Work Contract and the published artifact remains verifiable outside the running operator.


## v3.8 promotion

- [x] A2A 1.0 interoperability product surface
- [x] OTLP/HTTP JSON audit export
- [x] Work Object list/paging for SDK and adapters
- [x] expanded Studio operational timeline
- [x] packed A2A artifact smoke
- [x] release publication and GHCR digest verification
- [x] production Compose digest pin
- [x] post-merge main CI closeout (CI #1189)


## v3.8 stable release

- release branch: `release/3.8.0`
- stable package version: `3.8.0`
- stable release tag: `v3.8.0`
- release commit: `2b02d22e897d5fe736f93267c72036d951f74082`
- GitHub Release ID: `393558255`
- release verification run #189: success
- Container verification run #186: success
- GHCR digest: `sha256:f057384da7a5789aa71ffcec0ea4589ec8c10e7a9e1b37f8cabcabd303d38fcc`
- immutable image tag: `2b02d22e897d5fe736f93267c72036d951f74082`
- rollback: `v3.8.0-dev.1` / `sha256:acafde09bd74d535fb706acde68f7e6279283ac49f6d1863585d672fb691ac02`

## Post-release main hardening closeout

- PR #97: merged; `npm ci` enforced by CI, release, and Docker build paths
- PR #98: merged; explicit Apache-2.0 package metadata, complete license text, current contributor baseline, duplicate-free source manifest, `package-lock.json` source-tree coverage, and release metadata regression test
- PR #99: merged; status wording normalization
- PR #102: merged; Control Plane execution and terminal idempotency safety
- v3.8.1 release publication and container verification: complete

## v3.8 stable main closeout

- stable promotion PR #96: merged
- main promotion merge commit: `5b74c2f98f5f46ce75371bcf8301857da75a0947`
- main CI #1244 on the promotion merge commit: success
- current main release line: `3.8.0`
- final documentation/source-tree reconciliation is included in the current closeout commit; CI gates this exact main state.
- public production host/DNS/TLS/auth/secrets provisioning remains an external deployment-resource boundary, not a repository prerequisite.

