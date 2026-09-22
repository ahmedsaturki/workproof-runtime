const assert = require("assert");
const test = require("node:test");
const http = require("http");
import { OtlpLogExporter } from "../packages/telemetry/src/otel";

test("OTLP exporter sends a valid JSON log record without arbitrary audit fields", async () => {
  let received: any = null;
  const server = http.createServer((req: any, res: any) => {
    const chunks: any[] = [];
    req.on("data", (chunk: any) => chunks.push(chunk));
    req.on("end", () => {
      received = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      res.writeHead(200, { "content-type": "application/json" });
      res.end("{}");
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const address = server.address();
  const endpoint = "http://127.0.0.1:" + address.port + "/v1/logs";
  try {
    const exporter = new OtlpLogExporter({
      endpoint,
      serviceName: "workproof-test",
      serviceVersion: "3.7.0-dev.1",
      headers: { "x-test": "ok" }
    });
    assert.equal(await exporter.emit({
      requestId: "req-1",
      action: "dispatch",
      status: "verified",
      workId: "work-1",
      at: "2026-09-22T00:00:00.000Z",
      sensitive: "must-not-appear",
      arbitrary: { secret: "hidden" }
    }), true);
    assert.ok(received?.resourceLogs?.[0]?.scopeLogs?.[0]?.logRecords?.[0]);
    const record = received.resourceLogs[0].scopeLogs[0].logRecords[0];
    assert.equal(record.eventName, "workproof.control.audit");
    const attrs = Object.fromEntries(record.attributes.map((item: any) => [item.key, item.value]));
    assert.equal(attrs["workproof.requestId"].stringValue, "req-1");
    assert.equal(attrs["workproof.workId"].stringValue, "work-1");
    assert.equal(attrs["workproof.sensitive"], undefined);
    assert.equal(attrs["workproof.arbitrary"], undefined);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

export {};
