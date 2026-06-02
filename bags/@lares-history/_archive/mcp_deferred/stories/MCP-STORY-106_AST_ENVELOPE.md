> [!IMPORTANT]
> Consumption status: fully-consumed on 2026-04-23.
> Canonical loci-meme: `lar:///ha.ka.ba/@lares/docs/lararium_mcp/ast-execution-render`.
> This non-meme markdown source may become a safe-delete candidate after link checks confirm no required references remain.

# Story: MCP-STORY-106 — Lock memetic-wikitext and guest-grammar AST envelope

Parent epic: `MCP-EPIC-01`
Status: `done`
Size: `M`
Target sprint: `SPRINT-00 / SPRINT-01`

## User story

As the maintainer of the Lararium syntax layer,
I want one explicit AST envelope for memetic-wikitext and admitted guest grammars,
so that `lar:///...` identity edges can sit beside typed syntax graphs instead of carrying syntax by implication.

## Acceptance notes

- the contract distinguishes source carrier, syntax graph, execution graph, and render projection
- the contract names required node fields, edge fields, provenance fields, and lowering hooks
- TiddlyWiki parse-tree import fits the envelope without making TiddlyWiki runtime the host center

## Linked tasks

- `MCP-TASK-015`
- `MCP-TASK-016`
