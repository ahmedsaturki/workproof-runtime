const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const os = require("os");
const path = require("path");

import { LeaseStore } from "../packages/coordination/src/leases";
import { startControlPlane } from "../packages/control-plane/src/http";
import { startStudio } from "../apps/studio";

function tempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test("control plane exposes sanitized read-only lease visibility", async () => {
  const root = tempDir("workproof-control-leases-");
  const workers = new LeaseStore();
  const acquired = workers.acquire("work:demo:step:1", "worker-alpha", 10_000);
  assert.equal(acquired.status, "acquired");
  const auth = require("../packages/registry/src/auth.js");
  const policy = auth.addIssuedCredential(
    auth.createAuthPolicy(),
    auth.issueCredential({ id: "lease-reader", permissions: ["read"] })
  );
  const reader = auth.issueCredential({ id: "lease-reader-2", permissions: ["read"] });
  const authenticatedPolicy = auth.addIssuedCredential(policy, reader);
  const repo = {
    load: () => { throw new Error("unused"); },
    save: () => "unused"
  };

  const control = await startControlPlane({
    repository: repo,
    authPolicy: authenticatedPolicy,
    leaseStatusSource: workers
  });

  try {
    const missing = await fetch("http://127.0.0.1:" + control.port + "/v1/leases");
    assert.equal(missing.status, 401);

    const response = await fetch("http://127.0.0.1:" + control.port + "/v1/leases", {
      headers: { authorization: "Bearer " + reader.token }
    });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.version, "2.8");
    assert.equal(data.leases.length, 1);
    const lease = data.leases[0];
    assert.equal(lease.resourceId, "work:demo:step:1");
    assert.equal(lease.ownerId, "worker-alpha");
    assert.equal(lease.revision, 1);
    assert.equal(lease.active, true);
    assert.equal(typeof lease.expiresAt, "string");
    assert.equal(lease.token, undefined);
    assert.equal(lease.fencingToken, undefined);

    const mutation = await fetch("http://127.0.0.1:" + control.port + "/v1/leases", { method: "POST" });
    assert.equal(mutation.status, 404);
  } finally {
    await control.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("Studio exposes local lease visibility without leaking fence tokens", async () => {
  const root = tempDir("workproof-studio-leases-");
  const leases = new LeaseStore();
  const acquired = leases.acquire("work:local:step:1", "worker-local", 10_000);
  assert.equal(acquired.status, "acquired");

  const studio = await startStudio({
    workDirectory: root,
    port: 0,
    leaseStatusSource: leases
  });

  try {
    const response = await fetch("http://127.0.0.1:" + studio.port + "/api/leases");
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.version, "2.8");
    assert.equal(data.source, "local");
    assert.equal(data.leases.length, 1);
    assert.equal(data.leases[0].ownerId, "worker-local");
    assert.equal(data.leases[0].token, undefined);
  } finally {
    await studio.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("Studio proxies remote lease visibility through authenticated control plane", async () => {
  const root = tempDir("workproof-studio-remote-leases-");
  const controlRoot = path.join(root, "control-work");
  const studioRoot = path.join(root, "studio-work");
  const leases = new LeaseStore();
  const acquired = leases.acquire("work:remote:step:1", "worker-remote", 10_000);
  assert.equal(acquired.status, "acquired");

  const auth = require("../packages/registry/src/auth.js");
  const reader = auth.issueCredential({ id: "remote-lease-reader", permissions: ["read"] });
  const policy = auth.addIssuedCredential(auth.createAuthPolicy(), reader);
  const control = await startControlPlane({
    repository: {
      load: () => { throw new Error("unused"); },
      save: () => "unused"
    },
    authPolicy: policy,
    leaseStatusSource: leases
  });
  const studio = await startStudio({
    workDirectory: studioRoot,
    port: 0,
    controlPlaneUrl: "http://127.0.0.1:" + control.port
  });

  try {
    const missing = await fetch("http://127.0.0.1:" + studio.port + "/api/leases");
    assert.equal(missing.status, 401);

    const response = await fetch("http://127.0.0.1:" + studio.port + "/api/leases", {
      headers: { authorization: "Bearer " + reader.token }
    });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.version, "2.8");
    assert.equal(data.source, "control-plane");
    assert.equal(data.leases[0].resourceId, "work:remote:step:1");
    assert.equal(data.leases[0].ownerId, "worker-remote");
    assert.equal(data.leases[0].token, undefined);
    assert.equal(data.leases[0].fencingToken, undefined);
  } finally {
    await studio.close();
    await control.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("Studio reports lease visibility as 503 when neither local source nor control plane is configured", async () => {
  const root = tempDir("workproof-studio-leases-off-");
  const studio = await startStudio({ workDirectory: root, port: 0 });
  try {
    const response = await fetch("http://127.0.0.1:" + studio.port + "/api/leases");
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error, "lease-status-not-configured");
  } finally {
    await studio.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

export {};
