const assert = require("assert");
const test = require("node:test");
const { authorize, createAuthPolicy, issueCredential, namespaceVault, validateNamespace, validateAuthPolicy } = require("../packages/registry/src/auth.js");

test("registry auth rejects malformed bearer headers without accepting lookalike tokens", () => {
  const issued = issueCredential({ id: "sec-reader", permissions: ["read"] });
  const policy = createAuthPolicy();
  policy.credentials.push(issued.credential);

  const valid = authorize(policy, { authorization: `Bearer ${issued.token}` }, "read");
  assert.equal(valid.allowed, true);

  for (const authorization of [
    issued.token,
    `Basic ${issued.token}`,
    `Bearer ${issued.token} extra`,
    `bearer ${issued.token}`,
    `Bearer${issued.token}`
  ]) {
    const result = authorize(policy, { authorization }, "read");
    assert.equal(result.allowed, false);
    assert.equal(result.statusCode, 401);
  }
});

test("namespace validation and mapping reject traversal-shaped identifiers", () => {
  for (const value of ["../escape", "..", "/absolute", "A-UPPER", "space value", "a/b", "a\\b"]) {
    assert.throws(() => validateNamespace(value), /Invalid registry namespace/);
  }

  const root = "/tmp/workproof-security-root";
  const mapped = namespaceVault(root, "team-a");
  assert.equal(mapped, "/tmp/workproof-security-root/namespaces/team-a");
  assert.equal(mapped.startsWith(root + "/namespaces/"), true);
});

test("auth policy validation rejects malformed or duplicate credentials", () => {
  const issued = issueCredential({ id: "sec-reader", permissions: ["read"] });
  assert.doesNotThrow(() => validateAuthPolicy({ version: "0.1", credentials: [issued.credential] }));

  assert.throws(() => validateAuthPolicy({
    version: "0.1",
    credentials: [{ ...issued.credential, secretHash: "not-a-sha256" }]
  }), /Invalid registry credential/);

  assert.throws(() => validateAuthPolicy({
    version: "0.1",
    credentials: [issued.credential, { ...issued.credential }]
  }), /Invalid registry credential/);
});

export {};
