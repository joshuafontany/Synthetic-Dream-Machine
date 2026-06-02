# Task: MCP-TASK-005 — Implement `resources/list` and `resources/read`

Parent story: `MCP-STORY-201`
Status: `done`
Size: `M`

## Deliverable

Delivered a dependency-light stdio MCP JSON-RPC resource endpoint in `lares/lararium_mcp/server.py`.

The server supports:
- `initialize`
- `resources/list`
- `resources/read`
- `resources/templates/list`
- `tools/list`
- `tools/call`

Run with:

```bash
python3 -m lares.lararium_mcp
```
