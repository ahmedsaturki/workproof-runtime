const runtimeProcess = require("process");
const { PersistentLeaseStore } = require("../packages/coordination/src/persistent.js");

interface HeldLease {
  leaseId: string;
  revision: number;
}

type WorkerMessage = "acquire" | "fence" | "close";

const [, , dbPath, workerId, resourceId, ttlText] = runtimeProcess.argv;
if (!dbPath || !workerId || !resourceId || !ttlText) {
  runtimeProcess.stderr.write("Usage: fenced-worker <dbPath> <workerId> <resourceId> <ttlMs>\n");
  runtimeProcess.exitCode = 1;
} else {
  const ttlMs = Number(ttlText);
  const store = new PersistentLeaseStore(dbPath);
  let heldLease: HeldLease | null = null;

  const send = (message: Record<string, unknown>): void => runtimeProcess.send?.(message);

  const finish = (code: number): void => {
    try { store.close(); } catch {}
    try { runtimeProcess.disconnect?.(); } catch {}
    runtimeProcess.exit(code);
  };

  send({ type: "ready", workerId });

  runtimeProcess.on("message", (message: WorkerMessage) => {
    if (message === "acquire") {
      try {
        const result = store.acquire(resourceId, workerId, ttlMs);
        if (result.status === "acquired" || result.status === "renewed") {
          heldLease = { leaseId: result.lease.leaseId, revision: result.lease.revision };
        }
        send({ type: "acquire", workerId, result });
      } catch (error) {
        send({ type: "error", workerId, error: String(error) });
      }
      return;
    }

    if (message === "fence") {
      if (!heldLease) {
        send({ type: "fence", workerId, accepted: false, error: "No held lease" });
        return;
      }
      try {
        const current = store.assertOwned(resourceId, heldLease.leaseId, workerId);
        send({
          type: "fence",
          workerId,
          accepted: true,
          token: current.leaseId + ":" + current.revision,
          leaseId: current.leaseId,
          revision: current.revision
        });
      } catch (error) {
        send({ type: "fence", workerId, accepted: false, error: String(error) });
      }
      return;
    }

    if (message === "close") finish(0);
  });
}

export {};
