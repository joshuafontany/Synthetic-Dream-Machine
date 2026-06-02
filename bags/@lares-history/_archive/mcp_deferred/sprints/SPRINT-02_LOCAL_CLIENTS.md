> [!IMPORTANT]
> Consumption status: fully-consumed.
> Canonical loci-meme: `lar:///ha.ka.ba/@lares/docs/lararium_mcp/local-clients and lar:///ha.ka.ba/@lares/docs/lararium_mcp/sprint-ledger`.
> This non-meme markdown source may become a safe-delete candidate after link checks confirm no required references remain.

# Sprint: SPRINT-02 — Local Client Surfaces

Flow slot: **SPRINT-02 / closed sequence**
Goal: surface resources, prompts, and tools locally and wire first client integrations.

## Planned stories

- `MCP-STORY-202`
- `MCP-STORY-203`
- `MCP-STORY-401`
- `MCP-STORY-402`

## Exit markers

- hydration prompts exposed (`lares/lararium_mcp/prompts.py`, 6 prompts: boot_minimal, hydrate_full, boot_receipt, resolve_uri, read_carrier, compare_hydration) ✓
- prompt naming aligned to `lararium-` dash convention, matching tool naming ✓ (77 tests pass)
- read-only tool façade exposed (`lares/lararium_mcp/tools.py`) ✓
- `.mcp.json` wired for Claude Code local/project scope ✓
- `SUBMODULE_ADAPTER_INTERFACE.md` committed, adapter contract defined ✓
- VS Code Copilot path documented (`MCP-STORY-401`) ✓
- Codex config documented (`MCP-STORY-403`) ✓

Additional work landed this sprint beyond planned stories:
- `MCP-STORY-204` submodule adapter layer contract closed
- `MCP-STORY-403` Codex local config closed
- all story files reconciled with backlog truth (Status fields corrected)

Sprint-02 closed.
