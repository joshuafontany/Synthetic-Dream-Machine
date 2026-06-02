> [!IMPORTANT]
> Consumption status: fully-consumed on 2026-04-23.
> Canonical loci-meme: `lar:///ha.ka.ba/@lares/docs/lararium_mcp/ast-execution-render`.
> This non-meme markdown source may become a safe-delete candidate after link checks confirm no required references remain.

# Render Projection Contract — Lararium MCP

Status date: **April 23, 2026**
Depends on: `EXECUTION_GRAPH_SCHEMA.md`, `AST_ENVELOPE.md`

Deliverable for: `MCP-TASK-018`

---

## Position in the stack

```
execution graph
  ↓
render projection    ← this document
  ↓
DOM / tldraw / Kowloon / future scene target
```

The render layer consumes execution nodes and produces target-specific output.
Each target stays independent; the execution graph does not know which target fires.

---

## Render projection node schema

| Field | Type | Required | Description |
|---|---|---|---|
| `proj_id` | string | yes | `"{exec_id}/render/{target}"` |
| `exec_id` | string | yes | the execution node this projection traces to |
| `target` | string | yes | render target key: `dom`, `tldraw`, `kowloon`, `trace` |
| `output_shape` | string | yes | what the projection emits (see target table) |
| `payload` | object | yes | target-specific output fields |
| `source_span` | span object | no | provenance back to source text |

---

## Target table

| Target key | Output shape | Submodule | v1 scope |
|---|---|---|---|
| `dom` | HTML element tree | none (host renderer) | yes |
| `tldraw` | tldraw shape array | `tldraw/` | yes (read, no write) |
| `kowloon` | activity/feed event object | `kowloon/` | yes (read) |
| `trace` | closure trace markdown | none (compiler output) | yes |
| `scene` | scene-graph node tree | future | post-v1 |

---

## DOM projection payload

```json
{
  "tag": "div",
  "attributes": {"class": "ahu-frame", "data-anchor": "law"},
  "children": [
    {"tag": "p", "text": "One pranala carries one typed edge."}
  ]
}
```

DOM projection does not carry raw HTML strings.
It carries a typed element tree the host renderer serializes.

---

## tldraw projection payload

```json
{
  "shapes": [
    {
      "id": "shape:lar---AGENTS",
      "type": "geo",
      "x": 0, "y": 0,
      "props": {
        "w": 200, "h": 60,
        "text": "lar:///AGENTS",
        "geo": "rectangle"
      }
    }
  ],
  "bindings": []
}
```

tldraw projection produces shapes and bindings only.
The MCP server exposes these as read-only resource content.
Write-back to the canvas uses the existing `mcp__claude_ai_tldraw__exec` surface, not this server.

---

## Kowloon projection payload

```json
{
  "type": "hydration-event",
  "actor": "lararium-mcp",
  "object": {
    "type": "boot-receipt",
    "id": "lar:///boot/receipt",
    "sha256": "<hex>"
  },
  "published": "<ISO-8601>"
}
```

Kowloon projection emits ActivityStreams-shaped events for the activity/feed lane.
The `kowloon/` submodule adapter layer consumes these (MCP-STORY-204).

---

## Trace projection payload

```json
{
  "format": "markdown",
  "content": "## Boot closure trace\n\nEntry: lar:///AGENTS\n..."
}
```

Trace projection produces human-readable closure and hydration traces for operator inspection.
These surface as `lar:///graph/closure` resources.

---

## v1 read-only posture

All render projection in v1 produces read-only artifacts.
No projection in v1 writes back to tldraw canvas, Kowloon feeds, or DOM.
Write-back opens in a future story after read-only semantics settle.

---

## Residue

- tldraw shape-graph visualization implementation is SPRINT-03 work.
- Kowloon feed adapter implementation lives in MCP-STORY-204.
- Full DOM renderer is SPRINT-02 implementation work.
- Scene-graph target is post-v1.
