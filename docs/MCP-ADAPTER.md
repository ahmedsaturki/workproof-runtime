# WorkProof MCP Adapter

WorkProof Runtime provides an optional MCP adapter for AI hosts that need to discover and invoke WorkProof through the Model Context Protocol.

## Protocol

The adapter targets the MCP TypeScript SDK v2 and the MCP `2026-07-28` protocol revision. Current MCP v2 uses a stateless modern protocol era with `server/discover`; stdio remains the local-process transport. The adapter deliberately uses the official SDK rather than reimplementing the wire protocol.

## Safety boundary

The MCP server is an adapter, not an execution authority.

Every tool call is forwarded through the WorkProof Control Plane. The Control Plane remains responsible for authentication, authorization, idempotency, risk ceilings, policy, execution, verification, reconciliation, recovery, and proof.

Mutation tools require an explicit idempotency key as a tool argument:

- `workproof_dispatch`
- `workproof_resume`
- `workproof_cancel`

Read tools:

- `workproof_capabilities`
- `workproof_get_work`

Capability discovery is metadata and never grants permission to execute an operation.

## Local usage

Start the authenticated Control Plane first:

```bash
WORKPROOF_CONTROL_PLANE_PORT=8789 node dist/apps/control-plane.js
```

Then start the MCP adapter:

```WORKPROOF_MCP_CONTROL_PLANE_URL=http://127.0.0.1:8789 \
WORKPROOF_MCP_TOKEN=<control-plane-token> \
node dist/apps/mcp-server.js
```

The adapter reads:

- `WORKPROOF_MCP_CONTROL_PLANE_URL` — defaults to `http://127.0.0.1:8789`
- `WORKPROOF_MCP_TOKEN` — optional only when the target Control Plane itself does not require authentication

The process writes the MCP protocol only to stdout. Startup/log messages go to stderr.

## Host integration

Any MCP host that supports stdio can launch:

```bash
node /path/to/workproof-runtime/dist/apps/mcp-server.js
```

Set the two WorkProof environment variables in the host's MCP server configuration.

## Verification

The repository includes:

- an end-to-end protocol test using the official MCP client SDK;
- packaged MCP smoke from a freshly installed package artifact;
- capability inventory and idempotency replay/conflict coverage;
- the same full WorkProof CI and release/container gates used by the core runtime.

## Versioning

The adapter is additive. A future MCP transport or extension must preserve WorkProof semantics instead of becoming a parallel execution system.

