const RULESET_NAME = "main";
const RULESET_ID = process.env.WORKPROOF_MAIN_RULESET_ID || "23845160";
const TAG_RULESET_NAME = "v*";
const TAG_RULESET_ID = process.env.WORKPROOF_TAG_RULESET_ID || "23924353";
const REPOSITORY = process.env.GITHUB_REPOSITORY || "ahmedsaturki/workproof-runtime";
const fs = require("fs");
const path = require("path");

async function fetchRuleset(id) {
  const url = `https://api.github.com/repos/${REPOSITORY}/rulesets/${id}`;
  const headers = {
    accept: "application/vnd.github+json",
    "user-agent": "workproof-solo-governance-verifier"
  };
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (token) headers.authorization = "Bearer " + token;
  const response = await fetch(url, { headers });
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
  const ruleset = await fetchRuleset(RULESET_ID);

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

  const signatures = requiredRule(ruleset, "required_signatures");
  void signatures;

  const copilotRule = requiredRule(ruleset, "copilot_code_review");
  const copilot = copilotRule.parameters ?? {};
  assert(copilot.review_on_push === true, "Copilot code review on push must remain enabled");
  assert(copilot.review_draft_pull_requests === true, "Copilot review of draft pull requests must remain enabled");

  requiredRule(ruleset, "required_signatures");


  const statusChecks = requiredRule(ruleset, "required_status_checks");
  const s = statusChecks.parameters ?? {};
  assert(s.strict_required_status_checks_policy === true,
    "Required status checks must use strict freshness");
  const checks = s.required_status_checks ?? [];
  assert(checks.some((check) => check.context === "verify"),
    "The protected main ruleset must require the verify status check");

  const allowedMergeMethods = p.allowed_merge_methods ?? [];
  assert(allowedMergeMethods.length > 0, "At least one merge method must remain enabled");

  const lineage = JSON.parse(fs.readFileSync(path.resolve("docs/release-lineage.json"), "utf8"));
  const stableTag = "v" + lineage.release.version;
  const releaseHeaders = {
    accept: "application/vnd.github+json",
    "user-agent": "workproof-solo-governance-verifier"
  };
  const releaseToken = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (releaseToken) releaseHeaders.authorization = "Bearer " + releaseToken;
  const releaseResponse = await fetch("https://api.github.com/repos/" + REPOSITORY + "/releases/tags/" + stableTag, {
    headers: releaseHeaders
  });
  assert(releaseResponse.ok, "Published stable release lookup failed: HTTP " + releaseResponse.status);
  const release = await releaseResponse.json();
  assert(release.tag_name === stableTag, "Expected stable release " + stableTag + ", got " + release.tag_name);
  assert(release.draft === false, "Current stable release must not be a draft");
  assert(release.prerelease === false, "Current stable release must not be a prerelease");
  assert(release.immutable === true, "Current stable GitHub Release must be immutable");
  assert(release.target_commitish === lineage.release.commit, "Current stable release target must match release lineage");

  const tagRuleset = await fetchRuleset(TAG_RULESET_ID);
  assert(tagRuleset.name === TAG_RULESET_NAME, `Expected tag ruleset ${TAG_RULESET_NAME}, got ${tagRuleset.name}`);
  assert(tagRuleset.enforcement === "active", "release tag ruleset must be active");
  const tagRefs = tagRuleset.conditions?.ref_name?.include ?? [];
  assert(tagRefs.includes("refs/tags/v*"), "release tag ruleset must target refs/tags/v*");
  const tagBypassActors = tagRuleset.bypass_actors ?? [];
  assert(tagBypassActors.length === 0, "Release tag governance forbids ruleset bypass actors");
  requiredRule(tagRuleset, "deletion");
  requiredRule(tagRuleset, "non_fast_forward");
  requiredRule(tagRuleset, "update");

  console.log(JSON.stringify({
    status: "verified",
    governance: "solo",
    repository: REPOSITORY,
    ruleset: ruleset.name,
    rulesetId: RULESET_ID,
    tagRuleset: tagRuleset.name,
    tagRulesetId: TAG_RULESET_ID,
    tagRulesetTarget: tagRefs,
    tagRules: tagRuleset.rules.map((rule) => rule.type),
    stableRelease: stableTag,
    releaseImmutable: release.immutable,
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
