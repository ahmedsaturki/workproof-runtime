const path = require("path");
const { startRegistryServer } = require("../packages/registry/src/http.js");

const [, , vaultArg, portArg, hostArg] = process.argv;
const vaultDir = path.resolve(vaultArg ?? "./proof-vault");
const port = portArg ? Number(portArg) : 8787;
const host = hostArg ?? "127.0.0.1";

if (!Number.isInteger(port) || port < 0 || port > 65535) {
  process.stderr.write("Invalid registry port\n");
  process.exitCode = 1;
} else {
  startRegistryServer({ vaultDir, host, port }).then((running: any) => {
    process.stdout.write(JSON.stringify({
      registry: `http://${running.host}:${running.port}`,
      vaultDir,
      version: "1.0"
    }, null, 2) + "\n");
  }).catch((error: unknown) => {
    process.stderr.write(String(error) + "\n");
    process.exitCode = 1;
  });
}
export {};
