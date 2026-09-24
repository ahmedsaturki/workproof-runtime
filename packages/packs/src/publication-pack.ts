import { CapabilityRegistry } from "../../capabilities/src/registry";
import { Capability, EvidenceRef, Verifier } from "../../core/src/types";

interface PublishInput { baseUrl: string; publicationId: string; content: string; }

function validIdempotencyKey(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9._~-]{1,200}$/.test(value);
}

async function getPublication(input: PublishInput): Promise<{ status: number; body?: { id: string; content: string } }> {
  const response = await fetch(
    `${input.baseUrl}/publications/${encodeURIComponent(input.publicationId)}`,
    { headers: { accept: "application/json" } }
  );
  if (!response.ok) return { status: response.status };
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { status: 502 };
  }
  if (
    !body ||
    typeof body !== "object" ||
    typeof (body as any).id !== "string" ||
    typeof (body as any).content !== "string"
  ) {
    return { status: 502 };
  }
  return { status: response.status, body: body as { id: string; content: string } };
}

class LocalPublicationCapability implements Capability {
  name = "pack.publication.local";
  version = "0.2.0";
  operations = ["publish"];
  riskClass = "external_write" as const;

  async execute(request: any) {
    const input = request.input as PublishInput;
    if (
      !input ||
      typeof input.baseUrl !== "string" ||
      typeof input.publicationId !== "string" ||
      typeof input.content !== "string"
    ) {
      return { status: "rejected" as const, data: { reason: "Invalid publication input" } };
    }

    const idempotencyKey = request.idempotencyKey;
    if (!validIdempotencyKey(idempotencyKey)) {
      return {
        status: "rejected" as const,
        data: { reason: "publish requires a valid deterministic idempotency key" }
      };
    }

    try {
      const existing = await getPublication(input);
      if (existing.status === 200 && existing.body) {
        if (existing.body.id !== input.publicationId || existing.body.content !== input.content) {
          return {
            status: "rejected" as const,
            data: { reason: "Publication id already exists with different content", status: 409 }
          };
        }
        return {
          status: "accepted" as const,
          externalEffectId: `publication:${input.publicationId}`,
          evidence: [{
            id: `publication:${input.publicationId}`,
            kind: "public-state",
            uri: `${input.baseUrl}/publications/${encodeURIComponent(input.publicationId)}`
          }] as EvidenceRef[],
          data: { reconciled: true, idempotencyKey }
        };
      }
      if (existing.status !== 404) {
        return {
          status: "rejected" as const,
          data: { reason: "Publication preflight could not establish absence", status: existing.status }
        };
      }

      const response = await fetch(`${input.baseUrl}/publish`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": idempotencyKey
        },
        body: JSON.stringify({ id: input.publicationId, content: input.content })
      });
      if (!response.ok) {
        return { status: "rejected" as const, data: { status: response.status } };
      }
      return {
        status: "accepted" as const,
        externalEffectId: `publication:${input.publicationId}`,
        evidence: [{
          id: `publish:receipt:${input.publicationId}`,
          kind: "http-receipt",
          uri: `${input.baseUrl}/publish`
        }] as EvidenceRef[],
        data: { idempotencyKey }
      };
    } catch (error) {
      return {
        status: "ambiguous" as const,
        data: {
          reason: "Publication acknowledgement could not be confirmed",
          error: String(error)
        }
      };
    }
  }
}

class LocalPublicationVerifier implements Verifier {
  name = "pack.publication.local";
  async verify(ctx: any) {
    const input = ctx.work.contract.inputs as PublishInput;
    const expected = input.content;
    try {
      const response = await fetch(`${input.baseUrl}/publications/${encodeURIComponent(input.publicationId)}`);
      if (!response.ok) return { id: ctx.criterion.id, criterion: ctx.criterion.description, passed: false, details: `HTTP ${response.status}`, evidence: [] };
      const body = await response.json() as { id: string; content: string };
      const passed = body.id === input.publicationId && body.content === expected;
      return {
        id: ctx.criterion.id,
        criterion: ctx.criterion.description,
        passed,
        details: `public=${passed}; id=${body.id}`,
        evidence: passed ? [{ id: `publication:${body.id}`, kind: "public-state", uri: `${input.baseUrl}/publications/${encodeURIComponent(body.id)}` }] : []
      };
    } catch (error) {
      return { id: ctx.criterion.id, criterion: ctx.criterion.description, passed: false, details: String(error), evidence: [] };
    }
  }
}

export function registerPublicationPack(registry: CapabilityRegistry, verification: { register(v: Verifier): void }): void {
  registry.register(new LocalPublicationCapability());
  verification.register(new LocalPublicationVerifier());
}
