# Remote Sync Status

Date: 2026-09-21

## Verified local source

The exact local development workspace is:

- 53 tracked files
- local commit: 8cd9b7d841191b8a030bb462ac8dbd271f8259ca
- local tag: v0.4.0-dev
- 22/22 automated tests passed
- benchmark, CLI, persistence, verification, reconciliation, capability substitution, policy, and controlled browser acceptance passed

## Remote status

The remote `main` branch contains the verified kernel and a progressively synced subset of the source tree. The complete 53-file tree is intentionally not claimed as fully synced yet.

Remote sync is tracked in GitHub Issue #1.

## Exact full-source transfer

The complete local history is preserved in the `workproof-runtime-v0.4.0-dev.bundle` artifact produced by the engineering workspace.

To publish the exact local history from a machine that has network access to GitHub:

```bash
git clone /path/to/workproof-runtime-v0.4.0-dev.bundle workproof-runtime-full
cd workproof-runtime-full
git remote add origin https://github.com/ahmedsaturki/workproof-runtime.git
git push origin HEAD:refs/heads/local-v0.4.0-dev
git push origin v0.4.0-dev
```

This deliberately uses a separate branch first so the existing remote checkpoint is not overwritten. After remote verification, that branch can be reviewed and merged into `main`.

## Rule

Do not treat "remote source synced" as complete until:
1. remote tree matches the 53-file local manifest,
2. GitHub Actions passes from the remote tree,
3. the remote commit resolves to the expected source state,
4. the exact v0.4.0-dev tag is verified.
