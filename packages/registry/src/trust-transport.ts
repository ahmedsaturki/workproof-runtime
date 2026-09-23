const { URL } = require("url");
import type { TrustPolicySnapshot } from "../../evidence/src/trust-sync";

function normalizeBaseUrl(registryUrl: string): string {
  const url = new URL(registryUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Registry URL must use HTTP or HTTPS");
  return url.toString().replace(/\/$/, "");
}

async function parseRegistryResponse(response: Response): Promise<any> {
  const raw = await response.text();
  let data: any;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    throw new Error(`Registry returned invalid JSON (HTTP ${response.status})`);
  }
  if (!response.ok) throw new Error(data?.error ? String(data.error) : `Registry request failed (HTTP ${response.status})`);
  return data;
}

/**
 * Dedicated network sink for a TrustPolicySnapshot transport that has already
 * been cryptographically validated and schema-projected by the registry client.
 *
 * Keeping this sink isolated prevents the CodeQL exception from covering the
 * generic registry request path used by other payload classes.
 */
export async function postValidatedTrustSnapshot(
  registryUrl: string,
  transport: TrustPolicySnapshot,
  token?: string
): Promise<any> {
  const base = normalizeBaseUrl(registryUrl);
  const response = await fetch(`${base}/v1/trust/snapshots`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    // codeql[js/file-access-to-http]
    body: JSON.stringify(transport)
  });
  return parseRegistryResponse(response);
}
