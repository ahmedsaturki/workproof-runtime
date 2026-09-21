# Contributing

## Development baseline

The verified development target is v3.4.0-dev.2.

## Before submitting changes

Run:

```bash
npm test
npm run benchmark
npm run demo
```

Changes that affect external-effect semantics must include a regression test covering ambiguity, reconciliation, or duplicate-side-effect prevention.

## Architecture rule

Keep the core independent of any specific LLM, cloud provider, browser vendor, or hosted database. Add integrations as capabilities, verifiers, workers, or packs.
