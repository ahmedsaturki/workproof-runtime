# Work Completion Benchmark V3

Date: 2026-09-21

## Purpose

Evaluate end-to-end digital work by outcome closure rather than narration. Every mission must reach an independently verified result.

## Executable missions

- M001 — Research to artifact.
- M002 — HTTP discovery to verified artifact.
- M003 — Bounded Git change to a controlled local bare remote, including diff validation, commit, push, and independent remote verification.
- M004 — Accepted external write with deliberately lost acknowledgement; reconciliation must find the existing effect and prevent a second write.
- M005 — Repeated ambiguity on the primary capability; the runtime must substitute a compatible fallback and independently verify the requested outcome.

## Metrics

- verifiedCompletionRate
- falseDoneCount
- duplicateExternalEffectCount
- ambiguousOutcomeResolvedCount
- capabilitySubstitutionCount
- evidenceCompleteRate
- humanInterventionCount

## Safety boundaries

M003 uses a local bare Git remote. M004 uses a loopback HTTP server. M005 uses controlled in-memory state. The benchmark performs no uncontrolled external mutation.

## Pass criteria

All five missions must be verified, all five must carry evidence, M004 must produce exactly one POST, and M005 must emit a substitution event.
