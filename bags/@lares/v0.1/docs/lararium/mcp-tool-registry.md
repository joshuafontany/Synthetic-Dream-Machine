<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/lararium/mcp-tool-registry >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/docs/lararium/mcp-tool-registry"
file-path = "bags/@lares/v0.1/docs/lararium/mcp-tool-registry.md"
type  = "text/x-memetic-wikitext"
register      = "CS"
confidence    = 17
mana          = 17
manao         = 17
manaoio       = 16
tagspace      = "stable"
role          = "MCP tool registry: ten tools + two prompts, OODA-HA phase map, input schemas, env guards"
cacheable     = true
retain        = true
status-date   = "2026-04-30"
source-symbol = "lararium-hud lararium-canvas lararium-read lararium-inspect lararium-query lararium-edges lararium-draft lararium-write lararium-fire lararium-receipt lararium-align lararium-explain_uri"
```



<<~ ahu #head >>

# MCP Tool Registry

Ten registered tools and two prompts expose the Lararium graph API to MCP clients.
Tools map onto OODA-HA phases: Observe → Orient → Decide → Act → Aftermath.
Two env guards gate write access and canvas connectivity.

<<~/ahu >>

<<~&#x0002; >>

<<~ ahu #law >>

## Law

`LARARIUM_HTTP_URL` — required for canvas-connected tools (lararium-canvas, lararium-fire).
`LARARIUM_WRITE_MODE=enabled` — required for lararium-write with `dry_run: false`.

All tools pending Automerge-native MCP redesign return errors except:
- lararium-canvas — live HTTP pass-through to `/api/rooms`
- lararium-fire — live HTTP POST to `/api/fire`
- lararium-write — dry_run preview (always) or guarded write

<<~/ahu >>

<<~ ahu #schema >>

## Schema (machine-readable)

```toml
server-name = "lararium"
server-version = "0.1.0"

# Tool list — OODA-HA phase ordering
[[tools]]
name        = "lararium-hud"
phase       = "observe"           # ✶
description = "Full operator-agent alignment snapshot. Call this first to orient."
inputs      = []
env-required = []

[[tools]]
name        = "lararium-canvas"
phase       = "observe"           # ✶
description = "Live canvas state — active rooms, meme list, connection status."
inputs      = []
env-required = ["LARARIUM_HTTP_URL"]

[[tools]]
name        = "lararium-read"
phase       = "orient"            # ⏿
description = "Read the raw text of a file-backed lar:/// carrier (memetic wikitext)."
inputs      = ["uri: string"]
env-required = []

[[tools]]
name        = "lararium-inspect"
phase       = "orient"            # ⏿
description = "Inspect a lar:/// carrier: metadata, shape, implements list, outbound pranala edges."
inputs      = ["uri: string"]
env-required = []

[[tools]]
name        = "lararium-query"
phase       = "orient"            # ⏿
description = "Evaluate a TiddlyWiki5 filter expression against the current boot closure."
inputs      = ["expr: string"]
env-required = []

[[tools]]
name        = "lararium-edges"
phase       = "orient"            # ⏿
description = "List all pranala edges. Optional filter by family and fromUri substring."
inputs      = ["family?: enum(control|relation|observe|dataflow|message|reaction|constraint|spatial)", "from?: string"]
env-required = []

[[tools]]
name        = "lararium-draft"
phase       = "decide"            # ◇
description = "Scaffold a new meme carrier without writing to disk. Returns proposed carrier text."
inputs      = ["uri: string", "role?: string", "implements?: string[]", "body?: string"]
env-required = []

[[tools]]
name        = "lararium-write"
phase       = "act"               # ▶
description = "Write carrier text to a lares/ file. dry_run:true (default) previews; dry_run:false writes."
inputs      = ["uri: string", "text: string", "dry_run?: boolean = true"]
env-required = ["LARARIUM_WRITE_MODE=enabled (for dry_run:false)"]

[[tools]]
name        = "lararium-fire"
phase       = "act"               # ▶
description = "Fire a named reaction event on the live canvas server."
inputs      = ["fromUri: string", "trigger: string", "payload?: object"]
env-required = ["LARARIUM_HTTP_URL"]

[[tools]]
name        = "lararium-receipt"
phase       = "aftermath"         # ⤴
description = "Compile current boot receipt — SHA256 identity hash of the live closure."
inputs      = []
env-required = []

# Prompts
[[prompts]]
name        = "lararium-align"
description = "Bootstrap operator-agent alignment — orient the agent to the current graph state."
inputs      = []

[[prompts]]
name        = "lararium-explain_uri"
description = "Explain the resolution and carrier metadata for a lar:/// URI."
inputs      = ["uri: string"]
```

<<~/ahu >>

<<~ ahu #edges >>

<<~ pranala #to-node-host ? -> lar:///ha.ka.ba/@lararium/tw5/modules/node-host family:control role:depends >>
<<~ pranala #to-reaction-graph ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/reaction-graph family:control role:depends >>

<<~/ahu >>

<<~&#x0003; >>

<<~&#x0004; -> ? >>
