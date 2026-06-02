> [!IMPORTANT]
> Consumption status: fully-consumed on 2026-04-23.
> Canonical loci-meme: `lar:///ha.ka.ba/@lares/docs/lararium_mcp/spine`.
> This non-meme markdown source may become a safe-delete candidate after link checks confirm no required references remain.

# Story: MCP-STORY-111 — Build Lararium MCP read-only carrier spine

Parent epic: `MCP-EPIC-01`
Status: `done`
Size: `M`
Target sprint: `SPRINT-01`

## User story

As the maintainer of the Lararium MCP server,
I want a clean read-only carrier spine under `lares/`,
so that the server compiles from Lararium source truth before it exposes transports, clients, or legacy submodule adapters.

## Acceptance notes

- implementation lives under `lares/` and treats code outside `lares/` as legacy/provisional orichalcum
- `lar:///AGENTS` and `lar:///LARES` resolve as all-caps file-backed roots
- `lar:///INDEXES/**` resolves as an all-caps virtual root whose child paths may use any case
- `lar:///ha.ka.ba/@lares/**` resolves through the stable tuple root into `packages/lares-core/memes/**`
- future `lar:///*.*.*/**` tuple roots can resolve through the unstable tuple path without replacing all-caps roots
- carrier ingress extracts `#iam` metadata, `implements`, shape diagnostics, rating posture, and depth state
- interface and invariant indexes materialize as virtual read-only resources before MCP transport binding
- a dependency-light stdio MCP JSON-RPC server binds the carrier spine to `initialize`, `resources/list`, `resources/read`, `resources/templates/list`, `tools/list`, and `tools/call`

## Linked tasks

- `MCP-TASK-025`
- `MCP-TASK-026`
- `MCP-TASK-027`
- `MCP-TASK-028`
- `MCP-TASK-029`
