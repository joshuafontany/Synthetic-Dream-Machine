> [!IMPORTANT]
> Consumption status: fully-consumed on 2026-04-23.
> Canonical loci-meme: `lar:///ha.ka.ba/@lares/docs/lararium_mcp/adapters`.
> This non-meme markdown source may become a safe-delete candidate after link checks confirm no required references remain.

# Subtask: MCP-SUBTASK-007 — Map MemPalace contribution lane

Parent task: `MCP-TASK-012`
Status: `done`

## Outcome

- `lares/lararium_mcp/adapters/mempalace.py` — subprocess-launched JSON-RPC stdio client
- tool groups covered: search/query, knowledge graph (kg_query, kg_stats, kg_timeline), agent diary (diary_write, diary_read), navigation (traverse, create_tunnel)
- `lares/lararium_mcp/tests/test_mempalace_adapter.py` — 14 unit tests, all mocked, no live process required
- protocol: JSON-RPC over stdin/stdout, `_PROTOCOL_VERSION = "2025-11-25"`
