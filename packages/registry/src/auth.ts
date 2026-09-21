const crypto = require("crypto");
const fs = require("fs");

export type RegistryPermission = "read" | "write" | "trust";

export interface RegistryCredential {
  version: "0.1";
  id: string;
  secretHash: string;
  permissions: RegistryPermission[];
  namespace?: string;
  label?: string;
  createdAt: string;
  revokedAt?: string;
}

export interface RegistryAuthPolicy {
  version: "0.1";
  credentials: RegistryCredential[];
}

export interface AuthorizationDecision {
  allowed: boolean;
  statusCode: 200 | 401 | 403;
  credentialId?: string;
  namespace?: string;
  reason: "allowed" | "missing-token" | "invalid-token" | "revoked" | "permission-denied" | "invalid-policy";
}

export interface IssuedCredential {
  credential: RegistryCredential;
  token: string;
}

export function now(): string {
  return new Date().toISOString();
}

function validId(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/.test(value);
}

export function validateNamespace(value: string): string {
  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(value)) {
    throw new Error("Invalid registry namespace");
  }
  return value;
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

export function constantTimeTokenMatch(token: string, storedHash: string): boolean {
  if (!/^[0-9a-f]{64}$/.test(storedHash)) return false;
  const actual = Buffer.from(hashToken(token), "hex");
  const expected = Buffer.from(storedHash, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export function createAuthPolicy(): RegistryAuthPolicy {
  return { version: "0.1", credentials: [] };
}

export function issueCredential(args: {
  id: string;
  permissions: RegistryPermission[];
  namespace?: string;
  label?: string;
}): IssuedCredential {
  if (!validId(args.id)) throw new Error("Invalid registry credential ID");
  const permissions = [...new Set(args.permissions)];
  if (!permissions.length || permissions.some((p) => p !== "read" && p !== "write" && p !== "trust")) {
    throw new Error("Registry credential requires valid permissions");
  }
  const namespace = args.namespace === undefined ? undefined : validateNamespace(args.namespace);
  const token = crypto.randomBytes(32).toString("base64url");
  const credential: RegistryCredential = {
    version: "0.1",
    id: args.id,
    secretHash: hashToken(token),
    permissions,
    ...(namespace ? { namespace } : {}),
    ...(args.label ? { label: args.label } : {}),
    createdAt: now()
  };
  return { credential, token };
}

export function validateAuthPolicy(policy: RegistryAuthPolicy): RegistryAuthPolicy {
  if (!policy || policy.version !== "0.1" || !Array.isArray(policy.credentials)) {
    throw new Error("Invalid registry auth policy");
  }
  const seen = new Set<string>();
  for (const credential of policy.credentials) {
    if (
      !credential ||
      credential.version !== "0.1" ||
      !validId(credential.id) ||
      seen.has(credential.id) ||
      !/^[0-9a-f]{64}$/.test(credential.secretHash) ||
      !Array.isArray(credential.permissions) ||
      credential.permissions.length < 1 ||
      credential.permissions.some((p: unknown) => p !== "read" && p !== "write" && p !== "trust") ||
      (credential.namespace !== undefined && validateNamespace(credential.namespace) !== credential.namespace) ||
      typeof credential.createdAt !== "string"
    ) {
      throw new Error("Invalid registry credential");
    }
    seen.add(credential.id);
  }
  return policy;
}

export function loadAuthPolicy(filePath: string): RegistryAuthPolicy {
  if (!fs.existsSync(filePath)) throw new Error("Registry auth policy file is missing");
  const policy = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return validateAuthPolicy(policy);
}

export function saveAuthPolicy(filePath: string, policy: RegistryAuthPolicy): void {
  const validated = validateAuthPolicy(policy);
  fs.mkdirSync(require("path").dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp-${crypto.randomBytes(8).toString("hex")}`;
  fs.writeFileSync(temporary, JSON.stringify(validated, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
  fs.chmodSync(temporary, 0o600);
  fs.renameSync(temporary, filePath);
}

export function addIssuedCredential(policy: RegistryAuthPolicy, issued: IssuedCredential): RegistryAuthPolicy {
  const next = validateAuthPolicy(policy);
  if (next.credentials.some((item) => item.id === issued.credential.id)) {
    throw new Error(`Registry credential already exists: ${issued.credential.id}`);
  }
  next.credentials.push(issued.credential);
  return next;
}

export function revokeCredential(policy: RegistryAuthPolicy, credentialId: string, reason?: string): RegistryAuthPolicy {
  const next = validateAuthPolicy(policy);
  const credential = next.credentials.find((item) => item.id === credentialId);
  if (!credential) throw new Error(`Unknown registry credential: ${credentialId}`);
  if (!credential.revokedAt) credential.revokedAt = now();
  if (reason) credential.label = credential.label ? `${credential.label} [revoked: ${reason}]` : `revoked: ${reason}`;
  return next;
}

function authorizationToken(headers: Record<string, string | string[] | undefined>): string | null {
  const raw = headers.authorization;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  const match = /^Bearer ([A-Za-z0-9._~-]+)$/.exec(value.trim());
  return match ? match[1] : null;
}

export function authorize(
  policy: RegistryAuthPolicy | undefined,
  headers: Record<string, string | string[] | undefined>,
  permission: RegistryPermission
): AuthorizationDecision {
  if (!policy) return { allowed: true, statusCode: 200, reason: "allowed" };

  const token = authorizationToken(headers);
  if (!token) return { allowed: false, statusCode: 401, reason: "missing-token" };

  let validated: RegistryAuthPolicy;
  try {
    validated = validateAuthPolicy(policy);
  } catch {
    return { allowed: false, statusCode: 403, reason: "invalid-policy" };
  }

  for (const credential of validated.credentials) {
    if (!constantTimeTokenMatch(token, credential.secretHash)) continue;
    if (credential.revokedAt) {
      return { allowed: false, statusCode: 403, credentialId: credential.id, namespace: credential.namespace, reason: "revoked" };
    }
    if (!credential.permissions.includes(permission)) {
      return { allowed: false, statusCode: 403, credentialId: credential.id, namespace: credential.namespace, reason: "permission-denied" };
    }
    return { allowed: true, statusCode: 200, credentialId: credential.id, namespace: credential.namespace, reason: "allowed" };
  }

  return { allowed: false, statusCode: 401, reason: "invalid-token" };
}

export function namespaceVault(rootVaultDir: string, namespace?: string): string {
  if (!namespace) return rootVaultDir;
  const safe = validateNamespace(namespace);
  return require("path").join(rootVaultDir, "namespaces", safe);
}
