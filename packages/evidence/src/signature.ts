const crypto = require("crypto");
import { canonicalJson, sha256 } from "./integrity";

export interface ProofSignature {
  version: "0.1";
  algorithm: "ed25519";
  keyId: string;
  publicKey: string;
  signature: string;
  payloadDigest: string;
}

function payloadWithoutSignature(proof: Record<string, unknown>): Record<string, unknown> {
  const { signature: _signature, ...payload } = proof;
  return payload;
}

export function proofSigningPayload(proof: Record<string, unknown>): string {
  return canonicalJson(payloadWithoutSignature(proof));
}

export function proofKeyId(publicKey: string): string {
  return sha256(publicKey).slice(0, 32);
}

export function generateProofKeyPair(): { privateKey: string; publicKey: string } {
  const pair = crypto.generateKeyPairSync("ed25519");
  return {
    privateKey: pair.privateKey.export({ type: "pkcs8", format: "pem" }),
    publicKey: pair.publicKey.export({ type: "spki", format: "pem" })
  };
}

export function signProof(proof: Record<string, unknown>, privateKeyPem: string): ProofSignature {
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  const publicKey = crypto.createPublicKey(privateKey);
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" });
  const payload = proofSigningPayload(proof);
  const signature = crypto.sign(null, payload, privateKey).toString("base64url");
  return {
    version: "0.1",
    algorithm: "ed25519",
    keyId: proofKeyId(publicKeyPem),
    publicKey: publicKeyPem,
    signature,
    payloadDigest: sha256(payload)
  };
}

export function verifyProofSignature(proof: Record<string, unknown>, signature: ProofSignature): boolean {
  try {
    if (
      signature?.version !== "0.1" ||
      signature?.algorithm !== "ed25519" ||
      typeof signature?.keyId !== "string" ||
      typeof signature?.publicKey !== "string" ||
      typeof signature?.signature !== "string" ||
      typeof signature?.payloadDigest !== "string" ||
      !/^[0-9a-f]{32}$/.test(signature.keyId) ||
      !/^[0-9a-f]{64}$/.test(signature.payloadDigest) ||
      proofKeyId(signature.publicKey) !== signature.keyId
    ) return false;

    const payload = proofSigningPayload(proof);
    if (sha256(payload) !== signature.payloadDigest) return false;

    const publicKey = crypto.createPublicKey(signature.publicKey);
    const signatureBytes = Buffer.from(signature.signature, "base64url");
    return crypto.verify(null, payload, publicKey, signatureBytes);
  } catch {
    return false;
  }
}
