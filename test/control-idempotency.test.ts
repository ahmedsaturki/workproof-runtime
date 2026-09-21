const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const os = require("os");
const path = require("path");

import { WorkStore } from "../packages/core/src/work";
import { JsonWorkRepository } from "../packages/storage/src/json";
import { issueCredential, createAuthPolicy, addIssuedCredential } from "../packages/registry/src/auth";
import { startControlPlane } from "../packages/control-plane/src/http";
import { ControlPlaneClient } from "../packages/sdk/src/index";
import { startStudio } from "../apps/studio";

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

test("same idempotency key cannot be reused for a different mutation payload", async () => {
  const root = tempDir("workproof-idempotency-conflict-");
  const repo = new JsonWorkRepository(path.join(root, "work"));
  const credential = issueCredential({ id: "writer-conflict", permissions: ["write"] });
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
    const headers = {
      authorization: `Bearer ${credential.token}`,
      "idempotency-key": "dispatch-conflict-001",
      "content-type": "application/json"
    };

    const first = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ objective: "A" })
    });
    assert.equal(first.status, 200);

    const conflict = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ objective: "B" })
    });
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
  const credential = issueCredential({ id: "writer-race", permissions: ["write"] });
  const policy = addIssuedCredential(createAuthPolicy(), credential);
  let calls = 0;
  let releaseBarrier: (() => void) | undefined;

  const barrier = new Promise<void>((resolve) => {
    releaseBarrier = resolve;
  });

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
    const headers = {
      authorization: `Bearer ${credential.token}`,
      "idempotency-key": "dispatch-race-001",
      "content-type": "application/json"
    };

    const firstPromise = fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ objective: "race" })
    });

    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const second = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ objective: "race" })
    });
    assert.equal(second.status, 409);
    assert.equal((await second.json()).error, "idempotency-in-progress");

    releaseBarrier?.();

    const first = await firstPromise;
    assert.equal(first.status, 200);
    assert.equal(calls, 1);

    const replay = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ objective: "race" })
    });
    assert.equal(replay.status, 200);
    assert.equal(replay.headers.get("x-idempotency-replayed"), "true");
    assert.equal(calls, 1);
  } finally {
    releaseBarrier?.();
    await server.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("invalid idempotency keys are rejected at the control-plane boundary", async () => {
  const root = tempDir("workproof-idempotency-invalid-");
  const repo = new JsonWorkRepository(path.join(root, "work"));
  const credential = issueCredential({ id: "writer-invalid", permissions: ["write"] });
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
    const response = await fetch(`http://${server.host}:${server.port}/v1/work/dispatch`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${credential.token}`,
        "idempotency-key": "not safe!",
        "content-type": "application/json"
      },
      body: JSON.stringify({ objective: "invalid key" })
    });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /Idempotency-Key/);
    assert.equal(calls, 0);
  } finally {
    await server.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("SDK mutation methods send caller-supplied idempotency keys", async () => {
  const root = tempDir("workproof-idempotency-sdk-");
  const repo = new JsonWorkRepository(path.join(root, "work"));
  const credential = issueCredential({ id: "sdk-writer", permissions: ["write"] });
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
    const client = new ControlPlaneClient({
      baseUrl: `http://${server.host}:${server.port}`,
      token: credential.token
    });

    const first = await client.dispatch(
      { objective: "sdk replay" },
      { idempotencyKey: "sdk-dispatch-001" }
    );
    const replay = await client.dispatch(
      { objective: "sdk replay" },
      { idempotencyKey: "sdk-dispatch-001" }
    );

    assert.equal(replay.id, first.id);
    assert.equal(calls, 1);

    await assert.rejects(
      () => client.dispatch(
        { objective: "sdk bad key" },
        { idempotencyKey: "not safe!" }
      ),
      /Invalid idempotency key/
    );
  } finally {
    await server.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("Studio forwards idempotency keys to the authenticated control plane", async () => {
  const root = tempDir("workproof-idempotency-studio-");
  const repo = new JsonWorkRepository(path.join(root, "work"));
  const controlCredential = issueCredential({ id: "studio-writer", permissions: ["write"] });
  const controlPolicy = addIssuedCredential(createAuthPolicy(), controlCredential);
  let calls = 0;

  const control = await startControlPlane({
    repository: repo,
    authPolicy: controlPolicy,
    idempotencyDbPath: path.join(root, "control.sqlite"),
    dispatch: async (input) => {
      calls += 1;
      const work = sampleWork(String(input.objective));
      repo.save(work);
      return work;
    }
  });

  const studio = await startStudio({
    workDirectory: path.join(root, "work"),
    controlPlaneUrl: `http://${control.host}:${control.port}`
  });

  try {
    const url = `http://${studio.host}:${studio.port}/api/control/dispatch`;
    const headers = {
      authorization: `Bearer ${controlCredential.token}`,
      "idempotency-key": "studio-dispatch-001",
      "content-type": "application/json"
    };
    const body = JSON.stringify({ objective: "studio replay" });

    const first = await fetch(url, { method: "POST", headers, body });
    assert.equal(first.status, 200);

    const replay = await fetch(url, { method: "POST", headers, body });
    assert.equal(replay.status, 200);
    assert.equal(replay.headers.get("x-idempotency-replayed"), "true");
    assert.equal(calls, 1);
  } finally {
    await studio.close();
    await control.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

export {};
