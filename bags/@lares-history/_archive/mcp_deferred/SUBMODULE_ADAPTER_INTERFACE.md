> [!IMPORTANT]
> Consumption status: fully-consumed on 2026-04-23.
> Canonical loci-meme: `lar:///ha.ka.ba/@lares/docs/lararium_mcp/adapters`.
> This non-meme markdown source may become a safe-delete candidate after link checks confirm no required references remain.

# Submodule Adapter Interface — Lararium MCP

Status date: **April 23, 2026**
Depends on: `SUBMODULE_INTEGRATION_MATRIX.md`, `EXECUTION_GRAPH_SCHEMA.md`

Deliverable for: `MCP-TASK-014`

---

## Purpose

Each submodule contributes exactly one adapter.
Each adapter exposes a typed interface the MCP server calls without knowing submodule internals.
Adapters stay thin: they translate MCP resource/tool calls into submodule API calls and back.

---

## Adapter interface contract

Every adapter MUST implement this surface:

```python
class SubmoduleAdapter:
    name: str                    # e.g. "mempalace", "kowloon", "tldraw"
    version: str                 # semver pin matching current submodule pin
    contribution_lanes: list[str]  # from SUBMODULE_INTEGRATION_MATRIX.md

    def health(self) -> dict:
        """Return {"ok": bool, "detail": str}. No external calls."""

    def list_resources(self) -> list[ResourceEntry]:
        """Return submodule-scoped resources for MCP resources/list."""

    def read_resource(self, uri: str) -> str:
        """Read one submodule resource. Raise FileNotFoundError if absent."""

    def list_tools(self) -> list[dict]:
        """Return MCP tool definitions scoped to this submodule."""

    def call_tool(self, name: str, arguments: dict) -> object:
        """Dispatch one tool call. Raise ValueError for unknown names."""
```

All adapters MUST be read-only in v1.
All adapter tools MUST carry `readOnlyHint: true`.
Adapters MUST NOT accept write arguments in v1.

---

## URI namespace per adapter

| Adapter | Resource URI prefix | Tool prefix |
|---|---|---|
| MemPalace | `lar:///submodules/mempalace/` | `lararium.mempalace.*` |
| Kowloon | `lar:///submodules/kowloon/` | `lararium.kowloon.*` |
| Kowloon Client | `lar:///submodules/kowloon-client/` | `lararium.kowloon_client.*` |
| Kowloon Frontend | `lar:///submodules/kowloon-frontend/` | `lararium.kowloon_frontend.*` |
| tldraw | `lar:///submodules/tldraw/` | `lararium.tldraw.*` |
| TiddlyWiki5 | `lar:///submodules/tiddlywiki5/` | `lararium.tiddlywiki5.*` |

---

## Per-adapter near-term surface

### MemPalace

```
Resources:
  lar:///submodules/mempalace/status   — health and storage stats
  lar:///submodules/mempalace/index    — stored artifact index

Tools:
  lararium.mempalace.read_artifact     — read one stored artifact by key
  lararium.mempalace.store_receipt     — store boot receipt (write gate; post-v1)
```

### Kowloon

```
Resources:
  lar:///submodules/kowloon/status     — backend health
  lar:///submodules/kowloon/feed       — recent activity events (read-only)

Tools:
  lararium.kowloon.read_feed           — read N recent events
  lararium.kowloon.read_event          — read one event by ID
```

### tldraw

```
Resources:
  lar:///submodules/tldraw/status      — canvas status
  lar:///submodules/tldraw/shapes      — current canvas shape snapshot

Tools:
  lararium.tldraw.read_shapes          — read current canvas shapes
  lararium.tldraw.read_shape           — read one shape by ID
```

### TiddlyWiki5

```
Resources:
  lar:///submodules/tiddlywiki5/status         — submodule pin and health
  lar:///submodules/tiddlywiki5/filter_grammar — filter language grammar fixtures

Tools:
  lararium.tiddlywiki5.read_tiddler    — read one tiddler from the fixture corpus
  lararium.tiddlywiki5.list_tiddlers   — list tiddler titles in a category
```

---

## Adapter registry

The MCP server holds a registry of active adapters:

```python
ADAPTER_REGISTRY: dict[str, SubmoduleAdapter] = {}
```

On server start, adapters that pass `health()` register themselves.
Adapters that fail health do NOT block server start; they emit a startup warning.
Their resource and tool prefixes remain absent from `resources/list` and `tools/list`.

---

## Implementation gate

No adapter implementation lands until the interface contract settles.
The interface contract is this document.
Implementation work opens in SPRINT-02 / SPRINT-03.

---

## Residue

- MemPalace write-back (boot receipt persistence) opens post read-only gate.
- Kowloon write tools (posting events) open post-v1.
- tldraw write tools (placing shapes) open post-v1; use `mcp__claude_ai_tldraw__exec` in the interim.
- Kowloon-client and Kowloon-frontend adapters are lower priority than the primary Kowloon adapter.
