const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { Client } = require("@modelcontextprotocol/client");
const { StdioClientTransport } = require("@modelcontextprotocol/client/stdio");

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function waitForJsonLine(child, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => reject(new Error("Timed out waiting for control-plane startup: " + output)), timeoutMs);
    const onData = chunk => {
      output += chunk.toString();
      const match = /"port"\s*:\s*(\d+)/.exec(output);
      if (!match) return;
      clearTimeout(timer);
      child.stdout.off("data", onData);
      resolve(Number(match[1]));
    };
    child.stdout.on("data", onData);
    child.once("error", error => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", code => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error("control-plane exited: " + code + " output=" + output));
    });
  });
}

function textPayload(result) {
  if (!Array.isArray(result.content)) throw new Error("MCP result has no content");
  const textBlock = result.content.find(block => block.type === "text");
  if (!textBlock) throw new Error("MCP result has no text block");
  return JSON.parse(textBlock.text);
}

async function main() {
  const packageRoot = path.resolve(process.argv[2] || "");
  if (!packageRoot || !fs.existsSync(packageRoot)) throw new Error("Packed package root is required");

  const packageJson = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
  const controlEntry = path.join(packageRoot, "dist", "apps", "control-plane.js");
  const mcpEntry = path.join(packageRoot, "dist", "apps", "mcp-server.js");
  if (!fs.existsSync(controlEntry) || !fs.existsSync(mcpEntry)) throw new Error("Packed control-plane/MCP entrypoint missing");

  const root = tempDir("workproof-packed-mcp-");
  const child = spawn(process.execPath, [controlEntry], {
    cwd: root,
    env: {
      ...process.env,
      WORKPROOF_CONTROL_PLANE_PORT: "0",
      WORKPROOF_WORK_DIRECTORY: path.join(root, "work-runs")
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stderr = "";
  child.stderr.on("data", chunk => { stderr += chunk.toString(); });

  try {
    const port = await waitForJsonLine(child);
    const client = new Client(
      { name: "packed-mcp-smoke", version: "1.0.0" },
      { versionNegotiation: { mode: "auto" } }
    );
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [mcpEntry],
      env: {
        ...process.env,
        WORKPROOF_MCP_CONTROL_PLANE_URL: "http://127.0.0.1:" + port
      },
      stderr: "pipe"
    });

    try {
      await client.connect(transport);
      const listed = await client.listTools();
      const names = listed.tools.map(tool => tool.name).sort();
      const expected = [
        "workproof_cancel",
        "workproof_capabilities",
        "workproof_dispatch",
        "workproof_get_work",
        "workproof_resume"
      ];
      if (JSON.stringify(names) !== JSON.stringify(expected)) throw new Error("Packed MCP tool inventory mismatch: " + JSON.stringify(names));

      const capabilities = await client.callTool({ name: "workproof_capabilities", arguments: {} });
      if (capabilities.isError) throw new Error("Packed MCP capabilities tool failed");
      const values = textPayload(capabilities);
      if (!Array.isArray(values) || values.length === 0) throw new Error("Packed MCP capability inventory is empty");

      process.stdout.write(JSON.stringify({
        status: "verified",
        packageVersion: packageJson.version,
        toolCount: names.length,
        capabilityCount: values.length
      }, null, 2) + "\n");
    } finally {
      await client.close();
    }
  } finally {
    child.kill("SIGTERM");
    await new Promise(resolve => child.once("exit", resolve));
    if (stderr.trim()) process.stderr.write(stderr);
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main().catch(error => {
  process.stderr.write(String(error && error.stack ? error.stack : error) + "\n");
  process.exitCode = 1;
});
