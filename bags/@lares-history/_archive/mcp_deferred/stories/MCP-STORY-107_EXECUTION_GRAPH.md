> [!IMPORTANT]
> Consumption status: fully-consumed on 2026-04-23.
> Canonical loci-meme: `lar:///ha.ka.ba/@lares/docs/lararium_mcp/ast-execution-render`.
> This non-meme markdown source may become a safe-delete candidate after link checks confirm no required references remain.

# Story: MCP-STORY-107 — Define execution/widget graph contract

Parent epic: `MCP-EPIC-01`
Status: `done`
Size: `M`
Target sprint: `SPRINT-01`

## User story

As the maintainer of hydration and refresh behavior,
I want a typed execution-graph contract that lowers from AST into widget-like runtime nodes,
so that boot, refresh, and interaction can travel through execution graphs instead of raw text.

## Acceptance notes

- the contract names runtime node types, parent/child semantics, state slots, and refresh hooks
- the contract stays compatible with TiddlyWiki widget-tree lessons while keeping Lararium naming and law
- follow-on render targets can consume the contract without reparsing source text

## Linked tasks

- `MCP-TASK-017`
