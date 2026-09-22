const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function currentWindowsUserSid(): string {
  const systemRoot = process.env.SystemRoot;
  const whoami = systemRoot ? path.join(systemRoot, "System32", "whoami.exe") : "whoami.exe";
  const result = spawnSync(whoami, ["/user", "/fo", "csv", "/nh"], {
    encoding: "utf8",
    windowsHide: true
  });
  if (result.status !== 0) throw new Error("Unable to resolve the current Windows user SID");
  const match = /"[^"]*","(S-[0-9-]+)"/.exec(String(result.stdout ?? "").trim());
  if (!match) throw new Error("Unable to parse the current Windows user SID");
  return match[1];
}

export function hardenPrivateFile(filePath: string): void {
  if (process.platform !== "win32") {
    fs.chmodSync(filePath, 0o600);
    return;
  }
  const systemRoot = process.env.SystemRoot;
  const icacls = systemRoot ? path.join(systemRoot, "System32", "icacls.exe") : "icacls.exe";
  const userSid = currentWindowsUserSid();
  const result = spawnSync(icacls, [
    filePath,
    "/inheritance:r",
    "/grant:r",
    `*${userSid}:(F)`,
    "/grant:r",
    "*S-1-5-18:(F)"
  ], {
    encoding: "utf8",
    windowsHide: true
  });
  if (result.status !== 0) {
    const details = String(result.stderr ?? result.stdout ?? "").trim();
    throw new Error(`Unable to harden private file ACL on Windows${details ? `: ${details}` : ""}`);
  }
}
