# Epic: MCP-EPIC-03 — Remote HTTP/SSE Connector Surface

> Backlog prefix: `MCP-EPIC-03`
> Sequence lane: Phase 4 / remote surface
> Status: `todo`

## Outcome

A remote MCP deployment exposes the Lararium hydration layer safely to ChatGPT / API surfaces and other remote clients.

## Scope

- HTTP/SSE or streamable HTTP adapter
- deployment shape
- auth and scopes
- tool filtering and approval posture
- remote read-only beta path

## Included stories

- `MCP-STORY-301`
- `MCP-STORY-302`

## Exit criteria

- remote clients can call read-only hydration tools
- auth model appears documented
- scope policy avoids wildcard privilege
