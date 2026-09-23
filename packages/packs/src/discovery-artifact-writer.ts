import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface ValidatedDiscoveryRecord {
  name: string;
  website: string;
  source: string;
}

export function writeValidatedDiscoveryArtifact(filePath: string, records: ReadonlyArray<ValidatedDiscoveryRecord>): void {
  const temporary = filePath + ".tmp-" + crypto.randomBytes(8).toString("hex");
  try {
    fs.writeFileSync(temporary, JSON.stringify(records, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
    fs.renameSync(temporary, filePath);
  } catch (error) {
    try { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); } catch {}
    throw error;
  }
}
