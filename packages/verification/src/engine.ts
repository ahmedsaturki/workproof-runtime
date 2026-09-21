import { Verifier, VerificationCheck, VerificationResult, WorkObject } from "../../core/src/types";
import { now } from "../../core/src/work";

export class VerificationEngine {
  private readonly verifiers = new Map<string, Verifier>();

  register(verifier: Verifier): void {
    if (this.verifiers.has(verifier.name)) throw new Error(`Verifier already registered: ${verifier.name}`);
    this.verifiers.set(verifier.name, verifier);
  }

  async verify(work: WorkObject): Promise<VerificationResult> {
    const checks: VerificationCheck[] = [];
    for (const criterion of work.contract.success) {
      const verifier = this.verifiers.get(criterion.verifier);
      if (!verifier) {
        checks.push({ id: criterion.id, criterion: criterion.description, passed: false, details: `Missing verifier: ${criterion.verifier}`, evidence: [] });
        continue;
      }
      const check = await verifier.verify({ work, criterion, artifacts: work.artifacts });
      checks.push(check);
      for (const evidence of check.evidence) {
        if (!work.artifacts.some(a => a.id === evidence.id)) work.artifacts.push(evidence);
      }
    }

    if (checks.length === 0) {
      const result: VerificationResult = { status: "unverifiable", checks: [], verifiedAt: now() };
      work.verification = result;
      work.status = "unverifiable";
      work.events.push({ id: `evt_${Date.now()}`, type: "verification.completed", at: result.verifiedAt, message: "Verification status: unverifiable; no success criteria defined" });
      work.updatedAt = result.verifiedAt;
      return result;
    }

    const required = checks.filter((_, i) => work.contract.success[i]?.required);
    const passedRequired = required.filter(c => c.passed).length;
    const status: VerificationResult["status"] = required.length === 0
      ? "unverifiable"
      : passedRequired === required.length
        ? "verified"
        : passedRequired > 0 ? "partial" : "failed";
    const result: VerificationResult = { status, checks, verifiedAt: now() };
    work.verification = result;
    work.status = status;
    work.events.push({ id: `evt_${Date.now()}`, type: "verification.completed", at: result.verifiedAt, message: `Verification status: ${status}` });
    work.updatedAt = result.verifiedAt;
    return result;
  }
}
