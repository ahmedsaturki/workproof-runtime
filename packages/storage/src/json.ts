import { WorkObject } from "../../core/src/types";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function safeName(id: string): string {
  if (!/^[A-Za-z0-9._-]+$/.test(id)) throw new Error("Invalid work id");
  return id;
}

export class JsonWorkRepository {
  constructor(private readonly dir: string) { fs.mkdirSync(dir, { recursive: true }); }
  save(work: WorkObject): string {
    const target = path.join(this.dir, `${safeName(work.id)}.json`);
    const tmp = `${target}.tmp-${process.pid}-${crypto.randomBytes(8).toString("hex")}`;
    try {
      fs.writeFileSync(tmp, JSON.stringify(work, null, 2), { encoding: "utf8", flag: "wx" });
      fs.renameSync(tmp, target);
      return target;
    } catch (error) {
      try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch {}
      throw error;
    }
  }
  load(id: string): WorkObject {
    return JSON.parse(fs.readFileSync(path.join(this.dir, `${safeName(id)}.json`), "utf8"));
  }
  list(): string[] {
    return fs.readdirSync(this.dir).filter((f: string) => f.endsWith(".json"));
  }
}
