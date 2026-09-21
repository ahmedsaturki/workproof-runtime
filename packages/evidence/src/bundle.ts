import { WorkObject } from "../../core/src/types";

export function buildProofBundle(work: WorkObject): Record<string, unknown> {
  return {
    version: "0.1",
    work: {
      id: work.id,
      objective: work.contract.objective,
      status: work.status,
      createdAt: work.createdAt,
      updatedAt: work.updatedAt
    },
    effects: work.effects,
    artifacts: work.artifacts,
    verification: work.verification ?? null,
    events: work.events
  };
}
