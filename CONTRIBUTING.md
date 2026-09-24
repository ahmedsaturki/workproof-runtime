# Contributing

## Development baseline

The current release development baseline is **v3.8.14**.

## Before submitting changes

Run from a clean checkout:

```bash
npm ci
npm test
npm run benchmark
npm run demo
npm run doctor
npm run live-github-smoke
```

For release-affecting changes, also run:

```bash
npm run check
```

Changes that affect external-effect semantics must include a regression test covering ambiguity, reconciliation, or duplicate-side-effect prevention.

## Architecture rule

Keep the core independent of any specific LLM, cloud provider, browser vendor, or hosted database. Add integrations as capabilities, verifiers, workers, or packs.

## Distribution rule

The supported release channels are GitHub source/release artifacts and GHCR. Container base images must be pinned by immutable digest in `Dockerfile`; changes to the base digest require the container verification gates to pass. Dependabot is configured for weekly npm and GitHub Actions maintenance; dependency changes still require the normal CI/security gates. The npm package is intentionally marked private and is used as a package artifact rather than a public npm registry distribution.
