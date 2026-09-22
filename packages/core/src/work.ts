import { EffectRecord, SagaRecord, SagaStatus, SuccessCriterion, WorkContract, WorkEvent, WorkObject, WorkStatus } from "./types";

function now(): string { return new Date().toISOString(); }
function canonicalValue(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonicalValue).join(",") + "]";
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return "{" + Object.keys(record).sort().map(key => JSON.stringify(key) + ":" + canonicalValue(record[key])).join(",") + "}";
  }
  const serialized = JSON.stringify(value);
  return serialized === undefined ? "undefined" : serialized;
}
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
      sagas: [],
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

  addEffect(work: WorkObject, capability: string, riskClass: EffectRecord["riskClass"], idempotencyKey: string, operation?: string, input?: unknown): EffectRecord {
    const existing = work.effects.find(e => e.idempotencyKey === idempotencyKey);
    if (existing) {
      if (existing.operation && operation && existing.operation !== operation) {
        throw new Error(`Idempotency key already belongs to operation ${existing.operation}, not ${operation}`);
      }
      if (existing.input !== undefined && input !== undefined && canonicalValue(existing.input) !== canonicalValue(input)) {
        throw new Error("Idempotency key input does not match persisted effect input");
      }
      if (!existing.operation && operation) existing.operation = operation;
      if (existing.input === undefined && input !== undefined) existing.input = input;
      return existing;
    }
    const t = now();
    const effect: EffectRecord = {
      effectId: id("effect"),
      idempotencyKey,
      operation,
      input,
      kind: "forward",
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

  createSaga(work: WorkObject, forwardEffectIds: string[] = []): SagaRecord {
    const unknown = forwardEffectIds.filter(id => !work.effects.some(effect => effect.effectId === id));
    if (unknown.length) throw new Error("Unknown forward effect(s): " + unknown.join(", "));
    if (!work.sagas) work.sagas = [];
    const t = now();
    const saga: SagaRecord = {
      sagaId: id("saga"),
      status: forwardEffectIds.length ? "running" : "planned",
      forwardEffectIds: [...forwardEffectIds],
      compensationEffectIds: [],
      createdAt: t,
      updatedAt: t
    };
    work.sagas.push(saga);
    this.event(work, "saga.created", "Saga created", { sagaId: saga.sagaId, forwardEffectIds: saga.forwardEffectIds });
    return saga;
  }

  addCompensationEffect(
    work: WorkObject,
    sagaId: string,
    sourceEffectId: string,
    capability: string,
    riskClass: EffectRecord["riskClass"],
    idempotencyKey: string,
    operation?: string,
    input?: unknown
  ): EffectRecord {
    const saga = work.sagas?.find(item => item.sagaId === sagaId);
    if (!saga) throw new Error("Unknown saga: " + sagaId);
    const source = work.effects.find(effect => effect.effectId === sourceEffectId);
    if (!source) throw new Error("Unknown source effect: " + sourceEffectId);
    if (source.kind === "compensation") throw new Error("A compensation effect cannot be a source effect");
    if (!saga.forwardEffectIds.includes(sourceEffectId)) throw new Error("Source effect is not part of saga: " + sourceEffectId);

    const existing = work.effects.find(effect => effect.idempotencyKey === idempotencyKey);
    if (existing) {
      if (existing.kind !== "compensation" || existing.sourceEffectId !== sourceEffectId) throw new Error("Idempotency key already belongs to another effect");
      if (!saga.compensationEffectIds.includes(existing.effectId)) saga.compensationEffectIds.push(existing.effectId);
      return existing;
    }

    const effect = this.addEffect(work, capability, riskClass, idempotencyKey, operation, input);
    effect.kind = "compensation";
    effect.sourceEffectId = sourceEffectId;
    saga.compensationEffectIds.push(effect.effectId);
    this.event(work, "compensation.planned", "Compensation planned", { sagaId, sourceEffectId, compensationEffectId: effect.effectId });
    this.updateSagaStatus(work, sagaId);
    return effect;
  }

  updateSagaStatus(work: WorkObject, sagaId: string): SagaRecord {
    const saga = work.sagas?.find(item => item.sagaId === sagaId);
    if (!saga) throw new Error("Unknown saga: " + sagaId);
    const compensations = saga.compensationEffectIds
      .map(idValue => work.effects.find(effect => effect.effectId === idValue))
      .filter((effect): effect is EffectRecord => Boolean(effect));
    const verified = compensations.filter(effect => effect.status === "verified" || effect.status === "compensated").length;
    const unresolved = compensations.some(effect => ["unknown", "dispatched", "unresolved"].includes(effect.status));
    const verifiedSourceIds = new Set(
      compensations
        .filter(effect => effect.status === "verified" || effect.status === "compensated")
        .map(effect => effect.sourceEffectId)
        .filter((value): value is string => typeof value === "string")
    );
    const allForwardEffectsCompensated = saga.forwardEffectIds.every(effectId => verifiedSourceIds.has(effectId));
    let next: SagaStatus;
    if (compensations.length === 0) next = saga.forwardEffectIds.length ? "running" : "planned";
    else if (allForwardEffectsCompensated) next = "compensated";
    else if (verified > 0) next = "partial";
    else if (unresolved) next = "unresolved";
    else next = "running";
    if (next !== saga.status) this.event(work, "saga." + next, "Saga status updated", { sagaId, status: next });
    saga.status = next;
    saga.updatedAt = now();
    work.updatedAt = saga.updatedAt;
    return saga;
  }

  static successCriterion(contract: WorkContract, idValue: string): SuccessCriterion {
    const c = contract.success.find(s => s.id === idValue);
    if (!c) throw new Error(`Unknown success criterion: ${idValue}`);
    return c;
  }
}

export { now };
