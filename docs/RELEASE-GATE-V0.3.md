# Release Gate v0.3-dev — 2026-09-21

## Gates
- [x] TypeScript build passes with `noEmitOnError`.
- [x] Automated test suite passes: 16/16.
- [x] Real local HTTP external-effect reconciliation passes without duplicate POST.
- [x] Controlled publication is independently verified from public/read state after ambiguous acknowledgement.
- [x] Runtime rejects a capability whose declared risk exceeds the step risk ceiling.
- [x] Approval policy blocks unapproved external writes.
- [x] Capability substitution is exercised end-to-end.
- [x] Multi-step work executes and ends in verified status.
- [x] Web discovery capability performs HTTP retrieval, extraction, deduplication, artifact creation, and verification.
- [x] Local work state is persisted and reloaded.
- [x] `npm run check` passes the build/test/benchmark/demo/verification chain.
- [x] No TODO/FIXME/TBD markers remain in executable source or non-generated docs.

## Verified benchmark observations
- M001 Research-to-artifact: verified, 4 unique records.
- M002 Web discovery: verified, 3 unique records after deduplication.
- Ambiguous HTTP create: effect reconciled before retry; 1 POST.
- Controlled publication: public state verified after ambiguous acknowledgement; 1 POST.
- Capability substitution: primary rejected; fallback completed; work verified.

## Explicit limitations
- Browser automation is not a production adapter in this workspace because Playwright is not installed here.
- External search/email/GitHub/publishing integrations are not connected to third-party accounts by this dev workspace.
- Persistence is local JSON, not a distributed durable store.
- Compensation is a defined recovery direction, not a complete generalized saga engine.
- No claim of universal autonomous task completion or market uniqueness is made.

## Next gate
Build a real browser adapter and a multi-system mission using at least two independent capabilities, then measure verified completion, false-done rate, duplicate-effect rate, and recovery success.
