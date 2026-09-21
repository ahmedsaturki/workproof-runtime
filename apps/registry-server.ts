const path = require("path");
const fs = require("fs");
const { startRegistryServer } = require("../packages/registry/src/http.js");
const { loadAuthPolicy, validateNamespace } = require("../packages/registry/src/auth.js");
const { loadTrustPolicy } = require("../packages/evidence/src/trust.js");

const [, , vaultArg, portArg, hostArg, authPolicyArg, adminTrustPolicyArg] = process.argv;
const vaultDir = path.resolve(vaultArg ?? "./proof-vault");
const port = portArg ? Number(portArg) : 8787;
const host = hostArg ?? "127.0.0.1";

function trustedKeys(policyPath: string): string[] {
  const policy = loadTrustPolicy(policyPath);
  return policy.keys.filter((key: any) => key.state === "trusted").map((key: any) => key.keyId);
}

function resolveAdminTrust(authPolicy: any, trustPathArg?: string): {
  trustedAdminKeyIds: string[];
  trustedAdminKeyIdsByNamespace: Record<string, string[]>;
} {
  if (!trustPathArg) return { trustedAdminKeyIds: [], trustedAdminKeyIdsByNamespace: {} };
  const target = path.resolve(trustPathArg);
  if (!fs.statSync(target).isDirectory()) {
    return { trustedAdminKeyIds: trustedKeys(target), trustedAdminKeyIdsByNamespace: {} };
  }

  const trustedAdminKeyIdsByNamespace: Record<string, string[]> = {};
  const namespaces = [...new Set(
    (authPolicy?.credentials ?? [])
      .map((credential: any) => credential.namespace)
      .filter((namespace: unknown): namespace is string => typeof namespace === "string")
  )];

  for (const namespace of namespaces) {
    validateNamespace(namespace);
    const policyPath = path.join(target, `${namespace}.json`);
    if (!fs.existsSync(policyPath)) throw new Error(`Missing admin trust policy for namespace: ${namespace}`);
    trustedAdminKeyIdsByNamespace[namespace] = trustedKeys(policyPath);
  }

  const hasUnscoped = (authPolicy?.credentials ?? []).some((credential: any) => credential.namespace === undefined);
  return {
    trustedAdminKeyIds: hasUnscoped && fs.existsSync(path.join(target, "global.json"))
      ? trustedKeys(path.join(target, "global.json"))
      : [],
    trustedAdminKeyIdsByNamespace
  };
}

if (!Number.isInteger(port) || port < 0 || port > 65535) {
  process.stderr.write("Invalid registry port\n");
  process.exitCode = 1;
} else {
  let authPolicy: any;
  let trustConfig = { trustedAdminKeyIds: [] as string[], trustedAdminKeyIdsByNamespace: {} as Record<string, string[]> };
  try {
    authPolicy = authPolicyArg ? loadAuthPolicy(path.resolve(authPolicyArg)) : undefined;
    trustConfig = resolveAdminTrust(authPolicy, adminTrustPolicyArg);
  } catch (error) {
    process.stderr.write(String(error) + "\n");
    process.exitCode = 1;
  }
  if (!process.exitCode) {
    startRegistryServer({
      vaultDir,
      host,
      port,
      authPolicy,
      ...trustConfig
    }).then((running: any) => {
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
