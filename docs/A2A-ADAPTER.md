# WorkProof A2A Adapter

The A2A adapter exposes WorkProof as an A2A-compatible HTTP agent boundary while preserving WorkProof as the execution and proof authority.

## Supported surface

- Agent Card: `/.well-known/agent-card.json`
- JSON-RPC endpoint: `/rpc`
- `A2A-Version: 1.0` is required on JSON-RPC requests.
- Authentication: Bearer token at the adapter and the same credential is forwarded to the WorkProof Control Plane.
- Supported methods: `SendMessage`, `GetTask`, `CancelTask`.
- MCP/A2A adapters never become a parallel WorkProof execution authority.
- Streaming, push notifications, and multi-turn `message.taskId` flows are intentionally unsupported in this release.

## Agent Card

The card is cacheable for five minutes and emits an ETag. It advertises:

- JSON-RPC binding
- protocol version 1.0
- bearer security
- text input/output
- streaming disabled
- push notifications disabled

The adapter follows the public A2A 1.0 concepts for Agent Cards, JSON-RPC, task state mapping, authentication metadata, and version negotiation. Production public exposure should terminate TLS at the edge.

## Work mapping

A2A `SendMessage` creates a Work Object via `POST /v1/work/dispatch`.

- `message.messageId` becomes the deterministic idempotency source.
- `message.contextId` is preserved as the A2A task context.
- Optional WorkProof dispatch fields can be provided in `message.metadata.workproof`.
- The returned A2A Task is derived from the persisted Work Object and verification/artifact state.
- `GetTask` reads the persisted Work Object.
- `CancelTask` uses a deterministic idempotency key derived from the task ID.

## Local usage

Build first:

```bash
npm install
npm run build
WORKPROOF_A2A_TOKEN=replace-me npm run a2a-server
```

For a Control Plane requiring authentication:

```bash
WORKPROOF_A2A_CONTROL_PLANE_URL=http://127.0.0.1:8789 \
WORKPROOF_A2A_TOKEN=replace-me \
npm run a2a-server
```

The adapter defaults to loopback. Non-loopback/public deployment should use HTTPS at the edge and explicit authentication.

## Product boundary

A2A is interoperability only. The Work Object, risk ceilings, policy authorization, effects, independent verification, reconciliation, recovery, and proof remain authoritative in WorkProof.
