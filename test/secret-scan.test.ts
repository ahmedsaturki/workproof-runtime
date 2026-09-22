const assert = require("assert");
const test = require("node:test");

const { SECRET_PATTERNS } = require("../scripts/secret-scan.js");

test("secret scan does not flag a code-level private-key header check", () => {
  const code = 'if (!normalized.includes("-----BEGIN PUBLIC KEY-----") || normalized.includes("-----BEGIN PRIVATE KEY-----")) throw new Error("public-key only");';
  assert.equal(SECRET_PATTERNS[0].regex.test(code), false);
});

test("secret scan flags a complete private-key PEM block", () => {
  const body = "A".repeat(64);
  const begin = ["-----BEGIN", " PRIVATE KEY-----"].join("");
  const end = ["-----END", " PRIVATE KEY-----"].join("");
  const pem = begin + "\n" + body + "\n" + end;
  assert.equal(SECRET_PATTERNS[0].regex.test(pem), true);
});
