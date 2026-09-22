const assert = require("assert");
const test = require("node:test");
const { createAuthPolicy, issueCredential, addIssuedCredential, authorize } = require("../packages/registry/src/auth.js");

test("v1.2 trust transport credentials are not interchangeable with proof write credentials", () => {
  const policy = createAuthPolicy();
  const write = issueCredential({ id: "v12-write", permissions: ["write"], namespace: "team-a" });
  const trust = issueCredential({ id: "v12-trust", permissions: ["trust"], namespace: "team-a" });
  const read = issueCredential({ id: "v12-read", permissions: ["read"], namespace: "team-a" });
  addIssuedCredential(policy, write);
  addIssuedCredential(policy, trust);
  addIssuedCredential(policy, read);

  assert.equal(authorize(policy, { authorization: `Bearer ${write.token}` }, "write").allowed, true);
  assert.equal(authorize(policy, { authorization: `Bearer ${write.token}` }, "trust").allowed, false);
  assert.equal(authorize(policy, { authorization: `Bearer ${trust.token}` }, "trust").allowed, true);
  assert.equal(authorize(policy, { authorization: `Bearer ${trust.token}` }, "write").allowed, false);
  assert.equal(authorize(policy, { authorization: `Bearer ${read.token}` }, "trust").allowed, false);
});

test("v1.2 trust transport preserves namespace isolation", () => {
  const policy = createAuthPolicy();
  const trustA = issueCredential({ id: "v12-trust-a", permissions: ["trust"], namespace: "team-a" });
  addIssuedCredential(policy, trustA);
  const sameNamespace = authorize(policy, { authorization: `Bearer ${trustA.token}` }, "trust");
  assert.equal(sameNamespace.allowed, true);
  assert.equal(sameNamespace.namespace, "team-a");
});

export {};
