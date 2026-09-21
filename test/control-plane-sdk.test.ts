const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const os = require("os");
const path = require("path");

import { WorkObject } from "../packages/core/src/types";
import { WorkStore } from "../packages/core/src/work";
import { JsonWorkRepository } from "../packages/storage/src/json";
import { issueCredential, createAuthPolicy, addIssuedCredential } from "../packages/registry/src/auth";
import { startControlPlane } from "../packages/control-plane/src/http";
import { ControlPlaneClient, parseWorkObject, serializeWorkObject } from "../packages/sdk/src/index";

function sampleWork(): WorkObject {
  const store = new WorkStore();
  return store.create({
    objective: "control plane round trip",
    success: [],
    deliverables: ["proof"],
    riskClass: "read"
  });
}

test("SDK serializes and parses a Work Object without semantic loss", () => {
  const work = sampleWork();
  const restored = parseWorkObject(serializeWorkObject(work));
  assert.deepEqual(restored, work);
});

test("authenticated control plane enforces read/write permissions and audits actions", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "workproof-control-plane-"));
  const repo = new JsonWorkRepository(path.join(root, "work"));
  const work = sampleWork();
  repo.save(work);

  const policy = createAuthPolicy();
  const readCred = issueCredential({ id: "reader", permissions: ["read"] });
  const writeCred = issueCredential({ id: "writer", permissions: ["write"] });
  const withReader = addIssuedCredential(policy, readCred);
  const withWriter = addIssuedCredential(withReader, writeCred);
  const auditPath = path.join(root, "audit.jsonl");

  const dispatched: string[] = [];
  const server = await startControlPlane({
    repository: repo,
    authPolicy: withWriter,
    auditPath,
    dispatch: async (input) => {
      const created = sampleWork();
      created.contract.objective = String(input.objective);
      repo.save(created);
      dispatched.push(created.id);
      return created;
    },
    resume: async (persisted) => {
      persisted.status = "verified";
      persisted.events.push({
        id: "evt_resume",
        type: "control.resumed",
        at: new Date().toISOString(),
        message: "Resumed by test"
      });
      persisted.updatedAt = persisted.events[persisted.events.length - 1].at;
      repo.save(persisted);
      return persisted;
    }
  });

  try {
    const baseUrl = `http://${server.host}:${server.port}`;
    const reader = new ControlPlaneClient({ baseUrl, token: readCred.token });
    const writer = new ControlPlaneClient({ baseUrl, token: writeCred.token });

    const status = await reader.getWork(work.id);
    assert.equal(status.id, work.id);

    await assert.rejects(
      () => reader.cancel(work.id),
      /forbidden/
    );

    const created = await writer.dispatch({ objective: "dispatched work" });
    assert.equal(created.contract.objective, "dispatched work");
    assert.deepEqual(dispatched, [created.id]);

    const cancelled = await writer.cancel(work.id);
    assert.equal(cancelled.status, "cancelled");
    const cancelledAgain = await writer.cancel(work.id);
    assert.equal(cancelledAgain.status, "cancelled");
    assert.equal(
      cancelledAgain.events.filter((event) => event.type === "control.cancelled").length,
      cancelled.events.filter((event) => event.type === "control.cancelled").length
    );
    assert.ok(cancelled.events.some((event) => event.type === "control.cancelled"));

    const resumed = await writer.resume(work.id);
    assert.equal(resumed.status, "verified");

    await assert.rejects(
      () => writer.cancel(work.id),
      /work-already-terminal/
    );

    const audit = fs.readFileSync(auditPath, "utf8").trim().split("\n").map((line: string): Record<string, any> => JSON.parse(line));
    assert.ok(audit.some((entry: Record<string, any>) => entry.reason === "permission-denied"));
    assert.ok(audit.some((entry: Record<string, any>) => entry.action === "dispatch"));
    assert.ok(audit.some((entry: Record<string, any>) => entry.action === "cancel"));
    assert.ok(audit.some((entry: Record<string, any>) => entry.action === "resume"));
    assert.ok(audit.every((entry: Record<string, any>) => typeof entry.requestId === "string"));
  } finally {
    await server.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("SDK rejects invalid URLs and malformed Work Objects", () => {
  assert.throws(() => new ControlPlaneClient({ baseUrl: "ftp://localhost:1" }), /HTTP or HTTPS/);
  assert.throws(() => parseWorkObject(JSON.stringify({ id: "x" })), /Invalid Work Object/);
});

test("control plane rejects unauthenticated access when an auth policy is configured", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "workproof-control-plane-auth-"));
  const repo = new JsonWorkRepository(path.join(root, "work"));
  const work = sampleWork();
  repo.save(work);
  const policy = createAuthPolicy();
  const issued = issueCredential({ id: "reader", permissions: ["read"] });
  const withReader = addIssuedCredential(policy, issued);
  const server = await startControlPlane({ repository: repo, authPolicy: withReader });
  try {
    const response = await fetch(`http://${server.host}:${server.port}/v1/work/${work.id}`);
    assert.equal(response.status, 401);
    const body = await response.json();
    assert.equal(body.error, "unauthorized");
  } finally {
    await server.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

export {};
