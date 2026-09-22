# Work Completion Benchmark V1

The benchmark evaluates the system as an outcome engine, not as a chatbot.

## Metrics
- verified completion rate
- false-done rate
- duplicate external-effect rate
- ambiguous outcome resolution rate
- recovery success rate
- capability substitution rate
- artifact correctness
- evidence completeness
- human intervention rate

## Missions
M001 Local artifact: create file and verify read-back.
M002 Ambiguous effect: effect occurs, acknowledgement is lost, reconcile before retry.
M003 Substitution: primary capability fails, alternate capability completes the same contract.
M004 Research-to-artifact: search/extract/validate/dedupe/export.
M005 Controlled publication: publish to test app and verify public final state.
