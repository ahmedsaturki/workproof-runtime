const RULESET_NAME = "main";
const RULESET_ID = process.env.WORKPROOF_MAIN_RULESET_ID || "23845160";
const REPOSITORY = process.env.GITHUB_REPOSITORY || "ahmedsaturki/workproof-runtime";

async function fetchRuleset() {
  const url = `https://api.github.com/repos/${REPOSITORY}/rulesets/${RULESET_ID}`;
  const response = await fetch(url, {
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": "workproof-solo-governance-verifier"
    }
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub ruleset lookup failed: HTTP ${response.status}: ${body.slice(0, 400)}`);
  }
  return response.json();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function requiredRule(ruleset, type) {
  const rule = (ruleset.rules ?? []).find((item) => item.type === type);
  assert(rule, `Required ruleset rule is missing: ${type}`);
  return rule;
}

async function main() {
  const ruleset = await fetchRuleset();

  assert(ruleset.name === RULESET_NAME, `Expected ruleset ${RULESET_NAME}, got ${ruleset.name}`);
  assert(ruleset.enforcement === "active", "main ruleset must be active");

  const refs = ruleset.conditions?.ref_name?.include ?? [];
  assert(refs.includes("refs/heads/main"), "main ruleset must target refs/heads/main");

  const bypassActors = ruleset.bypass_actors ?? [];
  assert(bypassActors.length === 0, "Solo governance forbids ruleset bypass actors");

  const deletion = requiredRule(ruleset, "deletion");
  const nonFastForward = requiredRule(ruleset, "non_fast_forward");
  void deletion;
  void nonFastForward;

  const pullRequest = requiredRule(ruleset, "pull_request");
  const p = pullRequest.parameters ?? {};

  assert(p.required_approving_review_count === 0,
    `Solo governance requires zero mandatory approvals; got ${p.required_approving_review_count}`);
  assert(p.dismiss_stale_reviews_on_push === false,
    `Solo governance requires stale-review dismissal to be off; got ${p.dismiss_stale_reviews_on_push}`);
  assert(p.require_code_owner_review === false,
    `Solo governance requires Code Owner approval to be advisory; got ${p.require_code_owner_review}`);
  assert(p.require_last_push_approval === false,
    `Solo governance requires latest-push approval to be off; got ${p.require_last_push_approval}`);
  assert(p.required_review_thread_resolution === true,
    "All review threads must remain resolved before merge");
  assert(p.require_extra_approval_for_unattributed_changes === true,
    "Unattributed Copilot changes must retain the extra approval safety gate");

  const statusChecks = requiredRule(ruleset, "required_status_checks");
  const s = statusChecks.parameters ?? {};
  assert(s.strict_required_status_checks_policy === true,
    "Required status checks must use strict freshness");
  const checks = s.required_status_checks ?? [];
  assert(checks.some((check) => check.context === "verify"),
    "The protected main ruleset must require the verify status check");

  const allowedMergeMethods = p.allowed_merge_methods ?? [];
  assert(allowedMergeMethods.length > 0, "At least one merge method must remain enabled");

  console.log(JSON.stringify({
    status: "verified",
    governance: "solo",
    repository: REPOSITORY,
    ruleset: ruleset.name,
    rulesetId: RULESET_ID,
    enforcement: ruleset.enforcement,
    mainProtected: true,
    pullRequestRequired: true,
    mandatoryApprovals: p.required_approving_review_count,
    codeOwnerApprovalRequired: p.require_code_owner_review,
    latestPushApprovalRequired: p.require_last_push_approval,
    staleReviewDismissal: p.dismiss_stale_reviews_on_push,
    threadsMustBeResolved: p.required_review_thread_resolution,
    unattributedChangeExtraApproval: p.require_extra_approval_for_unattributed_changes,
    bypassActors: bypassActors.length,
    strictStatusChecks: s.strict_required_status_checks_policy,
    requiredChecks: checks.map((check) => check.context),
    allowedMergeMethods
  }, null, 2));
}

main().catch((error) => {
  process.stderr.write(String(error?.stack || error) + "\n");
  process.exitCode = 1;
});
