import { Capability } from "../../core/src/types";

export class CapabilityRegistry {
  private readonly capabilities = new Map<string, Capability>();

  register(capability: Capability): void {
    if (this.capabilities.has(capability.name)) throw new Error(`Capability already registered: ${capability.name}`);
    this.capabilities.set(capability.name, capability);
  }

  get(name: string): Capability {
    const capability = this.capabilities.get(name);
    if (!capability) throw new Error(`Unknown capability: ${name}`);
    return capability;
  }

  findFor(operation: string): Capability[] {
    return [...this.capabilities.values()].filter(c => c.operations.includes(operation));
  }

  list(): Capability[] { return [...this.capabilities.values()]; }
}
