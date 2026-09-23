const fs = require("fs");
import type { TrustPolicySnapshot } from "./trust-sync";
const { serializeTrustPolicySnapshot } = require("./trust-sync.js");

export function writeValidatedTrustSnapshot(outputPath: string, snapshot: TrustPolicySnapshot): void {
  const serialized = serializeTrustPolicySnapshot(snapshot);
  fs.writeFileSync(outputPath, serialized, "utf8");
}
