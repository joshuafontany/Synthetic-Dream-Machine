> [!IMPORTANT]
> Consumption status: fully-consumed on 2026-04-23.
> Canonical loci-meme: `lar:///ha.ka.ba/@lares/docs/lararium_mcp/adapters`.
> This non-meme markdown source may become a safe-delete candidate after link checks confirm no required references remain.

# Submodule Integration Matrix — Lararium MCP

Status date: **April 23, 2026**
Source of truth for current submodule set: `.gitmodules` + current submodule pins.

---

## Current submodule inventory

| Submodule | Path | Current pin | Core reading |
|---|---|---|---|
| MemPalace | `mempalace/` | `cef5994` | storage / retrieval substrate |
| Kowloon | `kowloon/` | `9a9949a` | backend, feed, activity, social event substrate |
| Kowloon Client | `kowloon-client/` | `fad027b` | client bridge for Kowloon operations |
| Kowloon Frontend | `kowloon-frontend/` | `c51dde3` | operator UI and flow reference |
| tldraw | `tldraw/` | `4677565` | canvas, render target, visual graph lane |
| TiddlyWiki5 | `tiddlywiki5/` | `bcc30e3` | direct Filter Language source and self-booting example graph |

---

## Contract

All current submodules count as core pieces of the MCP program.
No current submodule remains “later maybe” territory.
Each one must contribute at least one named lane from this set:

- runtime adapter
- protocol / schema source
- resource surface
- tool surface
- UI / app surface
- test fixture / comparison corpus

---

## Contribution map

### `mempalace`

Local repo evidence:
- repo README frames MemPalace as local-first memory and retrieval substrate
- Lararium crystal docs already name MemPalace as the storage substrate / orichalcum layer

Near-term MCP contribution:
- read-only memory resources
- retrieval tools and artifact storage alignment
- continuity and boot receipt persistence lane

### `kowloon`

Local repo evidence:
- package layout points toward backend routes, workers, methods, and ActivityParser
- Lararium story and signal docs already connect Kowloon to DreamDeck / feed layers

Near-term MCP contribution:
- activity / feed / event resources
- backend-facing tools for read-only inspection
- social graph and event stream comparison fixtures

### `kowloon-client`

Local repo evidence:
- README frames it as an isomorphic client for Kowloon across Node, browser, and React Native

Near-term MCP contribution:
- adapter surface for Kowloon operations
- stable client-oriented examples for tool schemas
- fixture source for argument and result contracts

### `kowloon-frontend`

Local repo evidence:
- frontend package depends on `@kowloon/client`
- current README still carries generic Vite boilerplate, so role clarification work remains open

Near-term MCP contribution:
- operator workflow reference
- future MCP app alignment
- testbed for UI-facing prompt and app semantics

### `tldraw`

Local repo evidence:
- repo README frames it as an infinite canvas SDK with AI integrations and workflow/chat starter kits
- Lararium docs already point toward tldraw canvas as session map and render target

Near-term MCP contribution:
- visual graph / render target lane
- MCP app lane
- closure trace and sprint-map visualization target

### `tiddlywiki5`

Local repo evidence:
- Lararium invariant already imports `x-tiddlywiki-filter`
- grammar docs already define direct guest-grammar admission through `hana`

Near-term MCP contribution:
- direct Filter Language source and fixtures
- self-describing / self-booting graph comparison corpus
- boot-preserved feature family for guest grammar import
- comparative `text -> parse tree -> widget tree -> DOM` architecture for Lararium AST and execution-graph design

Boundary:
- Filter Language import: **yes**
- full TiddlyWiki runtime import as constitutional center: **no for v1**

---

## Immediate follow-on tickets

- `MCP-STORY-104`
- `MCP-STORY-105`
- `MCP-STORY-204`
