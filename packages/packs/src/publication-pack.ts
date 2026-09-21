import { CapabilityRegistry } from "../../capabilities/src/registry";
import { Capability, EvidenceRef, Verifier } from "../../core/src/types";

interface PublishInput { baseUrl: string; publicationId: string; content: string; }

class LocalPublicationCapability implements Capability {
  name = "pack.publication.local";
  version = "0.1.0";
  operations = ["publish"];
  riskClass = "external_write" as const;
  async execute(request: any) {
    const input = request.input as PublishInput;
    const response = await fetch(`${input.baseUrl}/publish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: input.publicationId, content: input.content })
    });
    if (!response.ok) return { status: "rejected" as const, data: { status: response.status } };
    return { status: "accepted" as const, externalEffectId: `publication:${input.publicationId}`, evidence: [{ id: `publish:receipt:${input.publicationId}`, kind: "http-receipt", uri: `${input.baseUrl}/publish` }] as EvidenceRef[] };
  }
}

class LocalPublicationVerifier implements Verifier {
  name = "pack.publication.local";
  async verify(ctx: any) {
    const input = ctx.work.contract.inputs as PublishInput;
    const expected = input.content;
    try {
      const response = await fetch(`${input.baseUrl}/publications/${encodeURIComponent(input.publicationId)}`);
      if (!response.ok) return { id: ctx.criterion.id, criterion: ctx.criterion.description, passed: false, details: `HTTP ${response.status=}`, evidence: [] };
      const body = await response.json() as { id: string; content: string };
      const passed = body.id === input.publicationId && body.content === expected;
      return {
        id: ctx.criterion.id,
        criterion: ctx.criterion.description,
        passed,
        details: `public=${passed}; id=${body.id}`,
        evidence: passed ? [{ id: `publication:{body.id}}`, kind: "public-state", uri: `${input.baseUrl}/publications,${encodeURiComponent(body.id)}` }] : []
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
