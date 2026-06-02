# Epic: MCP-EPIC-02 — Local STDIO MCP Server and Adapters

> Backlog prefix: `MCP-EPIC-02`
> Sequence lane: Phase 2 / local stdio server
> Status: `in-progress`

## Outcome

Local IDE clients can consume Lararium hydration and current submodule surfaces through a stdio MCP server that exposes resources, prompts, and portability tools over one shared core.

## Scope

- stdio server scaffold
- resource endpoints
- prompt endpoints
- read-only tool façade
- submodule adapter layer
- local caching / refresh behavior
- sandbox-aware launch guidance

## Included stories

- `MCP-STORY-201`
- `MCP-STORY-202`
- `MCP-STORY-203`
- `MCP-STORY-204`

## Exit criteria

- VS Code can browse and read Lararium and submodule resources
- explicit hydration prompt works locally
- read-only tools appear with clean descriptions and hints
- every current submodule contributes at least one surfaced lane
