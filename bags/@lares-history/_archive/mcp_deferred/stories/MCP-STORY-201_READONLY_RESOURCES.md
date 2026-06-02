> [!IMPORTANT]
> Consumption status: fully-consumed on 2026-04-23.
> Canonical loci-meme: `lar:///ha.ka.ba/@lares/docs/lararium_mcp/hydration`.
> This non-meme markdown source may become a safe-delete candidate after link checks confirm no required references remain.

# Story: MCP-STORY-201 — Expose read-only resources for `lar:///...`

Parent epic: `MCP-EPIC-02`
Status: `done`
Size: `L`
Target sprint: `SPRINT-01`

## User story

As an IDE client,
I want to browse and read Lararium resources through MCP,
so that hydration and graph inspection work without custom repo-specific prompt text.

## Acceptance notes

- `resources/list` and `resources/read` now run through `python3 -m lares.lararium_mcp`
- virtual `lar:///INDEXES/**` resources materialize as JSON
- file-backed `lar:///AGENTS`, `lar:///LARES`, and `lar:///ha.ka.ba/@lares/**` resources read as text
- remaining story work should focus on client launch configs and integration polish

## Linked tasks

- `MCP-TASK-005`
