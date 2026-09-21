const assert = require("assert");
const test = require("node:test");
const { runBenchmark } = require("../apps/benchmark.js");

test("operator benchmark v3 executes five evidence-bearing missions and proves recovery metrics", async () => {
  const summary = await runBenchmark();
  assert.equal(summary.passed, true);
  assert.equal(summary.metrics.totalCases, 5);
  assert.equal(summary.metrics.verifiedCases, 5);
  assert.equal(summary.metrics.verifiedCompletionRate, 1);
  assert.equal(summary.metrics.falseDoneCount, 0);
  assert.equal(summary.metrics.duplicateExternalEffectCount, 0);
  assert.equal(summary.metrics.ambiguousOutcomeResolvedCount, 1);
  assert.equal(summary.metrics.capabilitySubstitutionCount, 1);
  assert.equal(summary.metrics.evidenceCompleteRate, 1);
  assert.equal(summary.metrics.humanInterventionCount, 0);
  assert.deepEqual(summary.cases.map((item: any) => item.id), ["M001", "M002", "M003", "M004", "M005"]);

  const m003 = summary.cases.find((item: any) => item.id === "M003");
  assert.equal(m003.details.branch, "main");
  assert.equal(m003.details.workingTree, "");

  const m004 = summary.cases.find((item: any) => item.id === "M004");
  assert.equal(m004.details.postRequests, 1);
  assert.equal(m004.details.duplicatesPrevented, 0);
  assert.equal(m004.details.reconciled, true);

  const m005 = summary.cases.find((item: any) => item.id === "M005");
  assert.equal(m005.details.primaryCalls, 2);
  assert.equal(m005.details.substituted, true);
  assert.equal(m005.details.fallbackStored, true);
});

export {};
