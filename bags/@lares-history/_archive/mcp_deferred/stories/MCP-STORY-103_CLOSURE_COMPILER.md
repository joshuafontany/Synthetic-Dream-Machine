> [!IMPORTANT]
> Consumption status: fully-consumed on 2026-04-23.
> Canonical loci-meme: `lar:///ha.ka.ba/@lares/docs/lararium_mcp/hydration`.
> This non-meme markdown source may become a safe-delete candidate after link checks confirm no required references remain.

# Story: MCP-STORY-103 — Implement deterministic closure compiler

Parent epic: `MCP-EPIC-01`
Status: `done`
Size: `L`
Target sprint: `SPRINT-01`

## User story

As the Lararium MCP core,
I want to compile deterministic closure from a canonical entry URI,
so that clients receive stable hydration packets and boot receipts.

## Acceptance notes

- repeated runs against same input yield same artifact ordering
- compiler traces why each locus entered the closure
- residue and exclusions appear in a readable form

## Linked tasks

- `MCP-TASK-004`
