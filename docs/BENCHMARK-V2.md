# Work Completion Benchmark V2

The benchmark evaluates real outcome handling rather than agent narration.

## Core metrics
- verified completion rate
- false-done rate
- duplicate external-effect rate
- ambiguous outcome resolution rate
- recovery success rate
- capability substitution rate
- artifact correctness
- evidence completeness
- human intervention rate

## Current executable cases
- M001: research fixture → dedupe → JSON artifact → independent verification.
- M002: HTTP discovery endpoint → extraction → dedupe → artifact → verification.
- M003: external create with lost acknowledgement → read-after-write reconciliation.
- M004: controlled publication with lost acknowledgement → public-state verification.
- M005: rejected primary capability → compatible fallback capability.
- M006: multi-step work with persisted Work Object state.
- M007: Chromium/CDP injected-page interaction with DOM-state verification.
- M008: repeated ambiguous outcome triggers capability substitution.
- M009: verifier failure during reconciliation remains recoverable and audited.
- M010: runtime approval and Work Contract risk-ceiling enforcement.

## Reporting rule
A case counts as passed only when its required success criteria are independently verified. A capability receipt alone is not sufficient for a verified outcome.
