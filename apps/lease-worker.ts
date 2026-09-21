const runtimeProcess = require("process");
const { PersistentLeaseStore } = require("../packages/coordination/src/persistent.js");

const [, , dbPath, workerId, resourceId, ttlText] = runtimeProcess.argv;
if (!dbPath || !workerId || !resourceId || !ttlText) {
  runtimeProcess.stderr.write("Usage: lease-worker <dbPath> <workerId> <resourceId> <ttlMs>\n");
  runtimeProcess.exitCode = 1;
} else {
  const ttlMs = Number(ttlText);
  const store = new PersistentLeaseStore(dbPath);
  const send = (message: Record<string, unknown>): void => {
    runtimeProcess.send?.(message);
  };

  const finish = (code: number): void => {
    store.close();
    runtimeProcess.disconnect?.();
    runtimeProcess.exit(code);
  };

  send({ type: "ready", workerId });

  runtimeProcess.on("message", (message: unknown) => {
    if (message !== "go") return;

    try {
      const result = store.acquire(resourceId, workerId, ttlMs);
      send({ type: "result", workerId, result });
      finish(0);
    } catch (error) {
      send({ type: "error", workerId, error: String(error) });
      finish(2);
    }
  });
}
