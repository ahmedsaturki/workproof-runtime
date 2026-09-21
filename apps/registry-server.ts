const path = require("path");
const { startRegistryServer } = require("../packages/registry/src/http.js");
const { loadAuthPolicy } = require("../packages/registry/src/auth.js");
const { loadTrustPolicy } = require("../packages/evidence/src/trust.js");

const [, , vaultArg, portArg, hostArg, authPolicyArg, adminTrustPolicyArg] = process.argv;
const vaultDir = path.resolve(vaultArg ?? "./proof-vault");
const port = portArg ? Number(portArg) : 8787;
const host = hostArg ?? "127.0.0.1";

if (!Number.isInteger(port) || port < 0 || port > 65535) {
  process.stderr.write("Invalid registry port\n");
  process.exitCode = 1;
} else {
  let authPolicy: any;
  let trustedAdminKeyIds: string[] = [];
  try {
    authPolicy = authPolicyArg ? loadAuthPolicy(path.resolve(authPolicyArg)) : undefined;
    if (adminTrustPolicyArg) {
      const policy = loadTrustPolicy(path.resolve(adminTrustPolicyArg));
      trustedAdminKeyIds = policy.keys.filter((key: any) => key.state === "trusted").map((key: any) => key.keyId);
    }
  } catch (error) {
    process.stderr.write(String(error) + "\n");
    process.exitCode = 1;
  }
  if (!process.exitCode) {
    startRegistryServer({ vaultDir, host, port, authPolicy, trustedAdminKeyIds }).then((running: any) => {
      process.stdout.write(JSON.stringify({
        registry: `http://${running.host}:${running.port}`,
        vaultDir,
        version: "1.2"
      }, null, 2) + "\n");
    }).catch((error: unknown) => {
      process.stderr.write(String(error) + "\n");
      process.exitCode = 1;
    });
  }
}

export {};
