export interface CompatibilityPolicy {
  version: "0.1";
  proofBundle: {
    min: "0.1";
    max: "0.1";
  };
  integrityManifest: {
    min: "0.1";
    max: "0.1";
  };
  portableProof: {
    min: "0.1";
    max: "0.1";
  };
}

export type CompatibilityStatus = "compatible" | "unsupported" | "invalid";

export interface CompatibilityAssessment {
  status: CompatibilityStatus;
  reason: string;
  policy: CompatibilityPolicy;
}

export const CURRENT_COMPATIBILITY_POLICY: CompatibilityPolicy = {
  version: "0.1",
  proofBundle: { min: "0.1", max: "0.1" },
  integrityManifest: { min: "0.1", max: "0.1" },
  portableProof: { min: "0.1", max: "0.1" }
};

function supported(value: unknown, range: { min: string; max: string }): boolean {
  return value === range.min && value === range.max && value === range.min;
}

export function assessProofCompatibility(proof: Record<string, unknown>): CompatibilityAssessment {
  const integrity = proof.integrity as Record<string, unknown> | undefined;

  if (!proof || typeof proof !== "object") {
    return {
      status: "invalid",
      reason: "proof must be an object",
      policy: CURRENT_COMPATIBILITY_POLICY
    };
  }

  if (!supported(proof.version, CURRENT_COMPATIBILITY_POLICY.proofBundle)) {
    return {
      status: "unsupported",
      reason: "proof bundle version " + String(proof.version) + " is not supported",
      policy: CURRENT_COMPATIBILITY_POLICY
    };
  }

  if (
    !integrity ||
    !supported(integrity.version, CURRENT_COMPATIBILITY_POLICY.integrityManifest)
  ) {
    return {
      status: "unsupported",
      reason: "integrity manifest version " + String(integrity?.version) + " is not supported",
      policy: CURRENT_COMPATIBILITY_POLICY
    };
  }

  return {
    status: "compatible",
    reason: "proof bundle and integrity manifest versions are supported",
    policy: CURRENT_COMPATIBILITY_POLICY
  };
}

export function compatibilityPolicy(): CompatibilityPolicy {
  return CURRENT_COMPATIBILITY_POLICY;
}
