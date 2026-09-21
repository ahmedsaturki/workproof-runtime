# Operating Model

## Work lifecycle
```text
planned
  -> running
  -> waiting_verification
  -> verified

failure branches:
  -> partial
  -> failed
  -> unresolved
  -> cancelled
```

## External effect lifecycle
```text
planned
  -> dispatched
  -> acknowledged
  -> observed
  -> verified

ambiguous path:
  dispatched/unknown
      -> reconcile
      -> verified/reconciled
      -> safe retry
      -> unresolved

reversible failure may later enter:
  compensated
```

## Truth layers
- observed: directly supported by evidence
- inferred: derived by the system and explicitly marked
- expected: contract/specification supplied by the user or integration

Never collapse these layers into one claim.
