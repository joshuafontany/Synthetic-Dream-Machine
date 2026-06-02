> [!IMPORTANT]
> Consumption status: fully-consumed on 2026-04-23.
> Canonical loci-meme: `lar:///ha.ka.ba/@lares/docs/lararium_mcp/ast-execution-render`.
> This non-meme markdown source may become a safe-delete candidate after link checks confirm no required references remain.

# Story: MCP-STORY-108 — Define render projection contract for DOM, tldraw, and scene-graph targets

Parent epic: `MCP-EPIC-01`
Status: `done`
Size: `M`
Target sprint: `SPRINT-01 / SPRINT-02`

## User story

As the maintainer of render surfaces,
I want one projection contract that lowers execution graphs into DOM, tldraw, and future scene-graph targets,
so that the Lararium can render the same underlying graph into multiple surfaces without changing host semantics.

## Acceptance notes

- the contract names common projection fields and target-specific extension lanes
- DOM projection appears as the first concrete target
- tldraw and Unreal-style scene graph appear as forward-compatible targets rather than vague inspiration

## Linked tasks

- `MCP-TASK-018`
