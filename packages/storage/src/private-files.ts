const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const platform = require("process").platform;

const WINDOWS_SYSTEM_SID = "S-1-5-18";

function windowsSystemCommand(command: string): string {
  const systemRoot = process.env.SystemRoot ?? process.env.WINDIR;
  if (!systemRoot) throw new Error("SystemRoot/WINDIR is required for Windows security operations");
  return path.join(systemRoot, "System32", `${command}.exe`);
}

function runWindowsCommand(command: string, args: string[]): string {
  const result = spawnSync(windowsSystemCommand(command), args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });
  if (result.error) throw new Error(`Windows security command failed: ${String(result.error)}`);
  if (result.status !== 0) {
    throw new Error(
      `Windows security command ${command} exited with ${String(result.status)}: ${String(result.stderr || "").trim()}`
    );
  }
  return String(result.stdout ?? "");
}

function currentWindowsUserSid(): string {
  const output = runWindowsCommand("whoami", ["/user", "/fo", "csv", "/nh"]);
  const match = output.match(/S-\d-\d+(?:-\d+)+/);
  if (!match) throw new Error("Unable to determine the current Windows user SID");
  return match[0];
}

function secureWindowsDirectory(directoryPath: string): void {
  const sid = currentWindowsUserSid();
  runWindowsCommand("icacls", [
    path.resolve(directoryPath),
    "/inheritance:r",
    "/grant:r",
    `*${sid}:(OI)(CI)F`,
    `*${WINDOWS_SYSTEM_SID}:(OI)(CI)F`
  ]);
}

function secureWindowsFile(filePath: string): void {
  const sid = currentWindowsUserSid();
  runWindowsCommand("icacls", [
    path.resolve(filePath),
    "/inheritance:r",
    "/grant:r",
    `*${sid}:F`,
    `*${WINDOWS_SYSTEM_SID}:F`
  ]);
}

export function securePrivateDirectory(directoryPath: string): void {
  const resolved = path.resolve(directoryPath);
  fs.mkdirSync(resolved, { recursive: true });
  if (platform === "win32") {
    secureWindowsDirectory(resolved);
  } else {
    fs.chmodSync(resolved, 0o700);
  }
}

export function securePrivateFile(filePath: string): void {
  const resolved = path.resolve(filePath);
  if (platform === "win32") {
    secureWindowsFile(resolved);
  } else {
    fs.chmodSync(resolved, 0o600);
  }
}
