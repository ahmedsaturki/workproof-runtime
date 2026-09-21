const assert = require("assert");
const test = require("node:test");
const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const { WorkStore } = require("../packages/core/src/work.js");
const { CapabilityRegistry } = require("../packages/capabilities/src/registry.js");
const { VerificationEngine } = require("../packages/verification/src/engine.js");
const { WorkEngine } = require("../packages/runtime/src/engine.js");
const { registerSQLitePack } = require("../packages/packs/src/sqlite-pack.js");

function makeDatabase() {
  const dir = fs.mkdtempSync(path.join("/tmp", "workproof-sqlite-"));
  const databasePath = path.join(dir, "fixture.db");
  const db = new DatabaseSync(databasePath);
  db.exec("CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT NOT NULL, state TEXT NOT NULL)");
  const insert = db.prepare("INSERT INTO items (id, name, state) VALUES (?, ?, ?)");
  for (const row of [
    [1, "Alpha", "ready"],
    [2, "Beta", "ready"],
    [3, "Gamma", "hold"]
  ]) insert.run(...row);
  db.close();
  return { dir, databasePath };
}

function setup() {
  const store = new WorkStore();
  const registry = new CapabilityRegistry();
  const verification = new VerificationEngine();
  registerSQLitePack(registry, verification);
  return { store, registry, verification };
}

test("SQLite query pack reads a real file-backed database and independently verifies rows", async () => {
  const fixture = makeDatabase();
  try {
    const { store, registry, verification } = setup();
    const work = store.create({
      objective: "Read ready database rows",
      inputs: {
        databasePath: fixture.databasePath,
        sql: "SELECT id, name, state FROM items WHERE state = ? ORDER BY id",
        params: ["ready"],
        maxRows: 10,
        expected: { minRows: 2, row: { id: 1, name: "Alpha", state: "ready" } }
      },
      constraints: {},
      success: [{ id: "rows", description: "At least two ready rows exist", verifier: "pack.database.sqlite.query", required: true }],
      deliverables: ["ready rows"],
      riskClass: "read"
    });

    const engine = new WorkEngine(store, registry, verification, async () => false);
    await engine.run(work, [{
      id: "query",
      operation: "query",
      capability: "pack.database.sqlite.query",
      input: work.contract.inputs,
      idempotencyKey: "sqlite:query:ready",
      riskClass: "read"
    }]);

    assert.equal(work.status, "verified");
    assert.ok(work.effects[0].receipt?.data?.rows?.length === 2);
    assert.ok(work.artifacts.some(a => a.kind === "sqlite-verification"));
  } finally {
    fs.rmSync(fixture.dir, { recursive: true, force: true });
  }
});

test("SQLite query pack bounds output and rejects multi-statement/non-SELECT input", async () => {
  const fixture = makeDatabase();
  try {
    const { registry, verification } = setup();
    const capability = registry.get("pack.database.sqlite.query");
    const context = { work: { contract: { inputs: {} } }, effect: undefined, log: () => {} };

    const bounded = await capability.execute({
      operation: "query",
      input: { databasePath: fixture.databasePath, sql: "SELECT id FROM items ORDER BY id", maxRows: 2 }
    }, context);
    assert.equal(bounded.status, "accepted");
    assert.deepEqual(bounded.data.rows.map(r => r.id), [1, 2]);
    assert.equal(bounded.data.truncated, true);

    const multi = await capability.execute({
      operation: "query",
      input: { databasePath: fixture.databasePath, sql: "SELECT id FROM items; SELECT id FROM items" }
    }, context);
    assert.equal(multi.status, "rejected");

    const write = await capability.execute({
      operation: "query",
      input: { databasePath: fixture.databasePath, sql: "UPDATE items SET state='ready'" }
    }, context);
    assert.equal(write.status, "rejected");
  } finally {
    fs.rmSync(fixture.dir, { recursive: true, force: true });
  }
});

test("SQLite upsert is local_write, idempotent by declared conflict key, and independently verified", async () => {
  const fixture = makeDatabase();
  try {
    const { store, registry, verification } = setup();
    const input = {
      databasePath: fixture.databasePath,
      table: "items",
      keyColumn: "id",
      row: { id: 2, name: "Beta-Updated", state: "ready" }
    };
    const capability = registry.get("pack.database.sqlite.upsert");

    const first = await capability.execute({ operation: "upsert", input }, { work: {}, effect: undefined, log: () => {} });
    const second = await capability.execute({ operation: "upsert", input }, { work: {}, effect: undefined, log: () => {} });
    assert.equal(first.status, "accepted");
    assert.equal(second.status, "accepted");

    const db = new DatabaseSync(fixture.databasePath);
    const count = db.prepare("SELECT COUNT(*) AS count FROM items WHERE id = 2").get();
    const row = db.prepare("SELECT id, name, state FROM items WHERE id = 2").get();
    db.close();
    assert.equal(Number(count.count), 1);
    assert.deepEqual(row, { id: 2, name: "Beta-Updated", state: "ready" });

    const work = store.create({
      objective: "Verify database row after upsert",
      inputs: input,
      constraints: {},
      success: [{ id: "row", description: "Database row matches expected upsert", verifier: "pack.database.sqlite.upsert", required: true }],
      deliverables: ["database row"],
      riskClass: "local_write"
    });
    const engine = new WorkEngine(store, registry, verification, async () => false);
    await engine.run(work, [{
      id: "upsert",
      operation: "upsert",
      capability: "pack.database.sqlite.upsert",
      input,
      idempotencyKey: "sqlite:upsert:items:2",
      riskClass: "local_write"
    }]);
    assert.equal(work.status, "verified");
    assert.ok(work.artifacts.some(a => a.kind === "sqlite-upsert-verification"));
  } finally {
    fs.rmSync(fixture.dir, { recursive: true, force: true });
  }
});

test("SQLite upsert rejects unsafe identifiers and oversized inputs before opening the database", async () => {
  const { registry } = setup();
  const capability = registry.get("pack.database.sqlite.upsert");
  const context = { work: {}, effect: undefined, log: () => {} };

  const unsafe = await capability.execute({
    operation: "upsert",
    input: { databasePath: "/tmp/not-used.db", table: "items;DROP", keyColumn: "id", row: { id: 1 } }
  }, context);
  assert.equal(unsafe.status, "rejected");

  const tooMany = Array.from({ length: 51 }, (_, i) => [`k${i}`, i]);
  const row = Object.fromEntries(tooMany);
  const oversized = await capability.execute({
    operation: "upsert",
    input: { databasePath: "/tmp/not-used.db", table: "items", keyColumn: "k0", row }
  }, context);
  assert.equal(oversized.status, "rejected");
});

export {};
