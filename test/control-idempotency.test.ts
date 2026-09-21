const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const os = require("os");
const path = require("path");

import { WorkStore } from "../packages/core/src/work";
import { JsonWorkRepository } from "../packages/storage/src/json";
import { issueCredential, createAuthPolicy, addIssuedCredential } from "../packages/registry/src/auth";
import { startControlPlane } from "../packages/control-plane/src/http";

function sampleWork(objective: string) {
  const store = new WorkStore();
  return store.create({
    objective,
    success: [],
    deliverables: ["proof"],
    riskClass: "read"
  });
}

function tempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test("control-plane dispatch replays a completed idempotency key after process restart", async () => {
  const root = tempDir("workproof-idempotency-replay-");
  const repo = new JsonWorkRepository(path.join(root, "work"));
  const ledgerPath = path.join(root, "control.sqlite");
  const credential = issueCredential({ id: "writer-replay", permissions: ["write"] });
  const policy = addIssuedCredential(createAuthPolicy(), credential);
  let calls = 0;
  const dispatch = async (input: Record<string, unknown>) => {
    calls += 1;
    const work = sampleWork(String(input.objective));
    repo.save(work);
    return work;
  };

  const first = await startControlPlane({
    repository: repo,
    authPolicy: policy,
    idempotencyDbPath: ledgerPath,
    dispatch
  });
  const url = `http://${first.host}:${first.port}/v1/work/dispatch`;
  const headers = {
    authorization: `Bearer ${credential.token}`,
    "idempotency-key": "dispatch-replay-001",
    "content-type": "application/json"
  };
  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ objective: "durable replay" })
    });
    assert.equal(response.status, 200);
    assert.equal(calls, 1);
  } finally {
    await first.close();
  }

  const second = await startControlPlane({
    repository: repo,
    authPolicy: policy,
    idempotencyDbPath: ledgerPath,
    dispatch
  });
  try {
    const replay = await fetch(`http://${second.host}:${second.port}/v1/work/dispatch`, {
      method: "POST",
      headers,
      body: JSON.stringify({ objective: "durable replay" })
    });
    assert.equal(replay.status, 200);
    assert.equal(replay.headers.get("x-idempotency-replayed"), "true");
    assert.equal(calls, 1);
    const body = await replay.json();
    assert.equal(body.work.contract.objective, "durable replay");
  } finally {
    await second.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const os = require("os");
const path = require("path");

import { WorkStore } from "../packages/core/src/work";
import { JsonWorkRepository } from "../packages/storage/src/json";
import { issueCredential, createAuthPolicy, addIssuedCredential } from "../packages/registry/src/auth";
import { startControlPlane } from "../packages/control-plane/src/http";

function sampleWork(objective: string) {
  const store = new WorkStore();
  return store.create({
    objective,
    success: [],
    deliverables: ["proof"],
    riskClass: "read"
  });
}

function tempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test("control-plane dispatch replays a completed idempotency key after process restart", async () => {
  const root = tempDir("workproof-idempotency-replay-");
  const repo = new JsonWorkRepository(path.join(root, "work"));
  const ledgerPath = path.join(root, "control.sqlite");
  const policy = addIssuedCredential(createAuthPolicy(), issueCredential({ id: "writer", permissions: ["write"] }));
  let calls = 0;
  const dispatch = async (input: Record<string, unknown>) => {
    calls += 1;
    const work = sampleWork(String(input.objective));
    repo.save(work);
    return work;
  };

  const first = await startControlPlane({ repository: repo, authPolicy: policy, idempotencyDbPath: ledgerPath, dispatch });
  const key = "dispatch-replay-001";
  try {
    const response = await fetch(`http://${first.host}:${first.port}/v1/work/dispatch`, {
      method: "POST",
      headers: { authorization: `Bearer ${issueCredential({ id: "unused", permissions: ["write"] }).token}` },
      body: JSON.stringify({ objective: "durable replay" })
    });
    assert.equal(response.status, 401);
  } finally {
    await first.close();
  }

  const credential = issueCredential({ id: "writer-replay", permissions: ["write"] });
  const replayPolicy = addIssuedCredential(createAuthPolicy(), credential);
  const second = await startControlPlane({ repository: repo, authPolicy: replayPolicy, idempotencyDbPath: ledgerPath, dispatch });
  try {
    const firstResponse = await fetch(`http://${second.host}:${second.port}/v1/work/dispatch`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${credential.token}`,
        "idempotency-key": key,
        "content-type": "application/json"
      },
      body: JSON.stringify({ objective: "durable replay" })
    });
    assert.equal(firstResponse.status, 200);
    const firstBody = await firstResponse.json();
    assert.equal(calls, 1);

    const replayResponse = await fetch(`http://${second.host}:${second.port}/v1/work/dispatch`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${credential.token}`,
        "idempotency-key": key,
        "content-type": "application/json"
      },
      body: JSON.stringify({ objective: "durable replay" })
    });
    assert.equal(replayResponse.status, 200);
    assert.equal(replayResponse.headers.get("x-idempotency-replayed"), "true");
    const replayBody = await replayResponse.json();
    assert.deepEqual(replayBody.work, firstBody.work);
    assert.equal(calls, 1);
  } finally {
    await second.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("same idempotency key cannot be reused for a different mutation payload", async () => {
  const root = tempDir("workproof-idempotency-conflict-");
  const repo = new JsonWorkRepository(path.join(root, "work"));
  const credential = issueCredential({ id: "writer", permissions: ["write"] });
  const policy = addIssuedCredential(createAuthPolicy(), credential);
  let calls = 0;
  const server = await startControlPlane({
    repository: repo,
    authPolicy: policy,
    idempotencyDbPath: path.join(root, "control.sqlite"),
    dispatch: async (input) => {
      calls += 1;
      const work = sampleWork(String(input.objective));
      repo.save(work);
      return work;
    }
  });
  try {
    const url = `http://${server.host}:${server.port}/v1/work/dispatch`;
    const headers = { authorization: `Bearer ${credential.token}`, "idempotency-key": "dispatch-conflict-001", "content-type": "application/json" };
    const first = await fetch(url, { method: "POST", headers, body: JSON.stringify({ objective: "A" }) });
    assert.equal(first.status, 200);
    const conflict = await fetch(url, { method: "POST", headers, body: JSON.stringify({ objective: "B" }) });
    assert.equal(conflict.status, 409);
    assert.equal((await conflict.json()).error, "idempotency-key-conflict");
    assert.equal(calls, 1);
  } finally {
    await server.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("concurrent control mutations with the same idempotency key execute only one mutation", async () => {
  const root = tempDir("workproof-idempotency-concurrent-");
  const repo = new JsonWorkRepository(path.join(root, "work"));
  const credential = issueCredential({ id: "writer", permissions: ["write"] });
  const policy = addIssuedCredential(createAuthPolicy(), credential);
  let calls = 0;
  let release: (() => void) | null = null;
  const barrier = new Promise<void>((resolve) => { release = resolve; });
  const server = await startControlPlane({
    repository: repo,
    authPolicy: policy,
    idempotencyDbPath: path.join(root, "control.sqlite"),
    dispatch: async (input) => {
      calls += 1;
      await barrier;
      const work = sampleWork(String(input.objective));
      repo.save(work);
      return work;
    }
  });
  try {
    const url = `http://${server.host}:${server.port}/v1/work/dispatch`;
    const headers = { authorization: `Bearer ${credential.token}`, "idempotency-key": "dispatch-race-001", "content-type": "application/json" };
    const firstPromise = fetch(url, { method: "POST", headers, body: JSON.stringify({ objective: "race" }) });
    await new Promise((resolve) => setImmediate(resolve));
    const second = await fetch(url, { method: "POST", headers, body: JSON.stringify({ objective: "race" }) });
    assert.equal(second.status, 409);
    assert.equal((await second.json()).error, "idempotency-in-progress");
    release!();
    const first = await firstPromise;
    assert.equal(first.status, 200);
    assert.equal(calls, 1);
    const replay = await fetch(url, { method: "POST", headers, body: JSON.stringify({ objective: "race" }) });
    assert.equal(replay.status, 200);
    assert.equal(replay.headers.get("x-idempotency-replayed"), "true");
    assert.equal(calls, 1);
  } finally {
    release?.();
    await server.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

export {};
