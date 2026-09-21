import { WorkObject } from "../../core/src/types";
const fs = require("fs");
const path = require("path");

function safeName(id: string): string {
  if (!/^[A-Za-z0-9._-]+$/.test(id)) throw new Error("Invalid work id");
  return id;
}

export class JsonWorkRepository {
  constructor(private readonly dir: string) { fs.mkdirSync(dir, { recursive: true }); }
  save(work: WorkObject): string {
    const target = path.join(this.dir, `${safeName(work.id)}.json`);
    const tmp = `${target}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(work, null, 2), "utf8");
    fs.renameSync(tmp, target);
    return target;
  }
  load(id: string): WorkObject {
    return JSON.parse(fs.readFileSync(path.join(this.dir, `${safeName(id)}.json`), "utf8"));
  }
  list(): string[] {
    return fs.readdirSync(this.dir).filter((f: string) => f.endsWith(".json"));
  }
}
