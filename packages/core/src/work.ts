import { EffectRecord, SuccessCriterion, WorkContract, WorkEvent, WorkObject, WorkStatus } from "./types";

function now(): string { return new Date().toISOString(); }
function id(prefix: string): string { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

export class WorkStore {
  private readonly works = new Map<string, WorkObject>();

  create(contract: WorkContract): WorkObject {
    const t = now();
    const work: WorkObject = {
      id: id("work"),
      contract,
      status: "planned",
      events: [],
      effects: [],
      artifacts: [],
      verification: undefined,
      createdAt: t,
      updatedAt: t
    };
    this.event(work, "work.created", "Work object created");
    this.works.set(work.id, work);
    return work;
  }

  register(work: WorkObject): void {
    this.works.set(work.id, work);
  }

  get(idValue: string): WorkObject {
    const work = this.works.get(idValue);
    if (!work) throw new Error(`Unknown work: ${idValue}`);
    return work;
  }

  transition(work: WorkObject, status: WorkStatus, message: string): void {
    work.status = status;
    this.event(work, `work.${status}`, message);
  }

  event(work: WorkObject, type: string, message: string, data?: Record<string, unknown>): WorkEvent {
    const event: WorkEvent = { id: id("evt"), type, at: now(), message, data };
    work.events.push(event);
    work.updatedAt = event.at;
    return event;
  }

  addArtifact(work: WorkObject, evidence: WorkObject["artifacts"][number]): void {
    if (work.artifacts.some(a => a.id === evidence.id)) return;
    work.artifacts.push(evidence);
    this.event(work, "artifact.added", `Artifact added: ${evidence.id}`, { kind: evidence.kind });
  }

  addEffect(work: WorkObject, capability: string, riskClass: EffectRecord["riskClass"], idempotencyKey: string, operation?: string): EffectRecord {
    const existing = work.effects.find(e => e.idempotencyKey === idempotencyKey);
    if (existing) {
      if (!existing.operation && operation) existing.operation = operation;
      return existing;
    }
    const t = now();
    const effect: EffectRecord = {
      effectId: id("effect"),
      idempotencyKey,
      operation,
      capability,
      riskClass,
      status: "planned",
      attempts: 0,
      attemptLog: [],
      createdAt: t,
      updatedAt: t
    };
    work.effects.push(effect);
    this.event(work, "effect.planned", `Effect planned: ${capability}`, { effectId: effect.effectId, operation: operation ?? null });
    return effect;
  }

  static successCriterion(contract: WorkContract, idValue: string): SuccessCriterion {
    const c = contract.success.find(s => s.id === idValue);
    if (!c) throw new Error(`Unknown success criterion: ${idValue}`);
    return c;
  }
}

export { now };
