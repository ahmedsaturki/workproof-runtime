import fs from "fs";
import { TrustPolicySnapshot, serializeTrustPolicySnapshot } from "../../evidence/src/trust-sync";

export function writeValidatedTrustSnapshot(outputPath: string, snapshot: TrustPolicySnapshot): void {
  const serialized = serializeTrustPolicySnapshot(snapshot);
  fs.writeFileSync(outputPath, serialized, "utf8");
}
