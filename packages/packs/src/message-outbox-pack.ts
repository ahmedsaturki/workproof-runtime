const crypto = require("crypto");
import { CapabilityRegistry } from "../../capabilities/src/registry";
import { Capability, CapabilityReceipt, EvidenceRef, Verifier } from "../../core/src/types";
const fs = require("fs");
const path = require("path");

export interface MessageOutboxInput {
  outboxPath: string;
  from: string;
  to: string[];
  subject: string;
  body: string;
}

const MAX_PATH = 4096;
const MAX_RECIPIENTS = 50;
const MAX_ADDRESS_BYTES = 320;
const MAX_SUBJECT_BYTES = 8 * 1024;
const MAX_BODY_BYTES = 1024 * 1024;
const MAX_MESSAGE_BYTES = 2 * 1024 * 1024;
const ADDRESS = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$/;

function validPath(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_PATH;
}

function containsHeaderInjection(value: unknown): boolean {
  return typeof value !== "string" || /[\r\n\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(value);
}

function validAddress(value: unknown): value is string {
  return typeof value === "string" && Buffer.byteLength(value, "utf8") <= MAX_ADDRESS_BYTES && ADDRESS.test(value) && !containsHeaderInjection(value);
}

function normalizeBody(value: unknown): string {
  if (typeof value !== "string") throw new Error("body must be a string");
  const normalized = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (Buffer.byteLength(normalized, "utf8") > MAX_BODY_BYTES) throw new Error(`body exceeds maximum size ${MAX_BODY_BYTES}`);
  return normalized;
}

function validate(input: MessageOutboxInput): void {
  if (!validPath(input.outboxPath)) throw new Error("outboxPath is invalid");
  if (!validAddress(input.from)) throw new Error("from is invalid");
  if (!Array.isArray(input.to) || input.to.length < 1 || input.to.length > MAX_RECIPIENTS || !input.to.every(validAddress)) {
    throw new Error(`to must contain 1-${MAX_RECIPIENTS} valid addresses`);
  }
  if (typeof input.subject !== "string" || containsHeaderInjection(input.subject) || Buffer.byteLength(input.subject, "utf8") > MAX_SUBJECT_BYTES) {
    throw new Error(`subject must be a single safe header value up to ${MAX_SUBJECT_BYTES} bytes`);
  }
  normalizeBody(input.body);
}

function canonicalMessage(input: MessageOutboxInput): { message: string; digest: string; messageId: string; bodyBytes: number } {
  validate(input);
  const body = normalizeBody(input.body);
  const headers = [
    `Message-ID: <pending@workproof.local>`,
    `From: ${input.from}`,
    `To: ${input.to.join(", ")}`,
    `Subject: ${input.subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8"
  ].join("\r\n");
  const unsigned = headers.replace("Message-ID: <pending@workproof.local>\r\n", "") + "\r\n\r\n" + body.replace(/\n/g, "\r\n") + "\r\n";
  const digest = crypto.createHash("sha256").update(unsigned, "utf8").digest("hex");
  const messageId = `<${digest}@workproof.local>`;
  const message = headers.replace("Message-ID: <pending@workproof.local>", `Message-ID: ${messageId}`) + "\r\n\r\n" + body.replace(/\n/g, "\r\n") + "\r\n";
  if (Buffer.byteLength(message, "utf8") > MAX_MESSAGE_BYTES) throw new Error(`message exceeds maximum size ${MAX_MESSAGE_BYTES}`);
  return { message, digest, messageId, bodyBytes: Buffer.byteLength(body, "utf8") };
}

function outboxFile(input: MessageOutboxInput, digest: string): string {
  return path.join(path.resolve(input.outboxPath), `${digest}.eml`);
}

function persistMessage(input: MessageOutboxInput, canonical: { message: string; digest: string; messageId: string; bodyBytes: number }): string {
  const directory = path.resolve(input.outboxPath);
  fs.mkdirSync(directory, { recursive: true });
  const file = outboxFile(input, canonical.digest);
  try {
    fs.writeFileSync(file, canonical.message, { encoding: "utf8", flag: "wx" });
    return file;
  } catch (error) {
    if (!error || (error as any).code !== "EEXIST") throw error;
    const existing = fs.readFileSync(file, "utf8");
    if (existing !== canonical.message) throw new Error("deterministic outbox collision detected");
    return file;
  }
}

function evidence(input: MessageOutboxInput, kind: string, filePath: string, metadata: Record<string, string | number | boolean>): EvidenceRef {
  return {
    id: `message-outbox:${kind}:${filePath}`,
    kind,
    uri: filePath,
    observedAt: new Date().toISOString(),
    metadata
  };
}

class MessageOutboxCapability implements Capability {
  name = "pack.messaging.outbox";
  version = "0.1.0";
  operations = ["compose"];
  riskClass = "local_write" as const;

  async execute(request: { operation: string; input: unknown }): Promise<CapabilityReceipt> {
    if (request.operation !== "compose") return { status: "rejected", data: { reason: "unsupported operation" } };
    const input = request.input as MessageOutboxInput;
    try {
      const canonical = canonicalMessage(input);
      const filePath = persistMessage(input, canonical);
      return {
        status: "accepted",
        data: {
          messageId: canonical.messageId,
          digest: canonical.digest,
          filePath,
          bodyBytes: canonical.bodyBytes
        },
        externalEffectId: `message-outbox:${canonical.digest}`,
        evidence: [evidence(input, "message-outbox-written", filePath, {
          messageId: canonical.messageId,
          digest: canonical.digest,
          recipients: input.to.length,
          bodyBytes: canonical.bodyBytes
        })]
      };
    } catch (error) {
      return { status: "rejected", data: { reason: String(error) } };
    }
  }
}

class MessageOutboxVerifier implements Verifier {
  name = "pack.messaging.outbox";

  async verify(ctx: { work: any; criterion: any }) {
    const input = ctx.work.contract.inputs as MessageOutboxInput;
    try {
      const canonical = canonicalMessage(input);
      const filePath = outboxFile(input, canonical.digest);
      if (!fs.existsSync(filePath)) {
        return { id: ctx.criterion.id, criterion: ctx.criterion.description, passed: false, details: "outbox message missing", evidence: [] };
      }
      const actual = fs.readFileSync(filePath, "utf8");
      const passed = actual === canonical.message;
      return {
        id: ctx.criterion.id,
        criterion: ctx.criterion.description,
        passed,
        details: `messageId=${canonical.messageId}; digest=${canonical.digest}; bytes=${Buffer.byteLength(actual, "utf8")}`,
        evidence: passed ? [evidence(input, "message-outbox-verification", filePath, {
          messageId: canonical.messageId,
          digest: canonical.digest,
          bytes: Buffer.byteLength(actual, "utf8")
        })] : []
      };
    } catch (error) {
      return { id: ctx.criterion.id, criterion: ctx.criterion.description, passed: false, details: String(error), evidence: [] };
    }
  }
}

export function registerMessageOutboxPack(
  registry: CapabilityRegistry,
  verification: { register(v: Verifier): void }
): void {
  registry.register(new MessageOutboxCapability());
  verification.register(new MessageOutboxVerifier());
}
