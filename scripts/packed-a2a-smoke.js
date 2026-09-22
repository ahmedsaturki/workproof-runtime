const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

function waitForReady(child, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => reject(new Error("Timed out waiting for A2A startup: " + output)), timeoutMs);
    const onData = chunk => {
      output += chunk.toString();
      try {
        const value = JSON.parse(output.trim().split("\n").at(-1));
        if (value?.status === "ready" && Number.isInteger(value.port)) {
          clearTimeout(timer);
          child.stdout?.off("data", onData);
          resolve(value.port);
        }
      } catch {}
    };
    child.stdout?.on("data", onData);
    child.once("error", error => { clearTimeout(timer); reject(error); });
    child.once("exit", code => { if (code !== 0) reject(new Error("A2A process exited: " + code)); });
  });
}

async function main() {
  const packageRoot = path.resolve(process.argv[2] || "");
  if (!packageRoot || !fs.existsSync(packageRoot)) throw new Error("Packed package root is required");
  const card = path.join(packageRoot, "dist", "apps", "a2a-server.js");
  if (!fs.existsSync(card)) throw new Error("Packed A2A entrypoint missing");

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "workproof-packed-a2a-"));
  const child = spawn(process.execPath, [card], {
    cwd: root,
    env: { ...process.env, WORKPROOF_A2A_PORT: "0", WORKPROOF_A2A_TOKEN: "packed-a2a-smoke-token-123456", WORKPROOF_A2A_CONTROL_PLANE_URL: "http://127.0.0.1:9" },
    stdio: ["ignore","pipe","pipe"]
  });
  try {
    const port = await waitForReady(child);
    const response = await fetch("http://127.0.0.1:"+port+"/.well-known/agent-card.json");
    if (!response.ok) throw new Error("Packed A2A agent card failed: "+response.status);
    const body = await response.json();
    if (body.version !== JSON.parse(fs.readFileSync(path.join(packageRoot,"package.json"),"utf8")).version) throw new Error("Packed A2A version mismatch");
    if (body.capabilities?.streaming !== false) throw new Error("Packed A2A streaming flag mismatch");
    process.stdout.write(JSON.stringify({status:"verified",packageVersion:body.version,agentCard:true,streaming:false})+"\n");
  } finally {
    child.kill("SIGTERM");
    await new Promise(resolve=>child.once("exit",resolve));
    fs.rmSync(root,{recursive:true,force:true});
  }
}
main().catch(error=>{process.stderr.write(String(error)+"\n");process.exitCode=1});
