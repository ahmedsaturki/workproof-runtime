import { CapabilityRegistry } from "../../capabilities/src/registry";
import { Capability } from "../../core/src/types";
const fs = require("fs");

class LocalFileCreateCapability implements Capability {
  name = "pack.local.file.create";
  version = "0.2.0";
  operations = ["create_file"];
  riskClass = "local_write" as const;
  async execute(request: any) {
    const input = request.input as { path: string; content?: string };
    fs.writeFileSync(input.path, input.content ?? "", "utf8");
    return { status: "accepted" as const, externalEffectId: `file:${input.path}` };
  }
}

class LocalFileReadCapability implements Capability {
  name = "pack.local.file.read";
  version = "0.2.0";
  operations = ["read_file"];
  riskClass = "read" as const;
  async execute(request: any) {
    const input = request.input as { path: string };
    return { status: "accepted" as const, data: fs.readFileSync(input.path, "utf8") };
  }
}

export function registerLocalPack(registry: CapabilityRegistry): void {
  registry.register(new LocalFileCreateCapability());
  registry.register(new LocalFileReadCapability());
}
