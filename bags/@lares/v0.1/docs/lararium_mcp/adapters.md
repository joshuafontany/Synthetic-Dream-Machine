<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/lararium_mcp/adapters >>
```toml iam
uri-path     = "ha.ka.ba/@lares/v0.1/docs/lararium_mcp/adapters"
file-path = "bags/@lares/v0.1/docs/lararium_mcp/adapters.md"
type = "text/x-memetic-wikitext"
tagspace     = "stable"
register     = "Synthesis-Canon"
mana         = 16
manaoio      = 15
manao        = 17
role         = "canonical submodule adapter and sidecar integration contract for Lararium MCP"
source-consumes = [
  "packages/lares-core/memes/docs/mcp/SUBMODULE_ADAPTER_INTERFACE.md",
  "packages/lares-core/memes/docs/mcp/SUBMODULE_INTEGRATION_MATRIX.md",
  "packages/lares-core/memes/docs/mcp/mempalace.md",
  "packages/lares-core/memes/docs/mcp/subtasks/MCP-SUBTASK-007_MEMPALACE_LANE.md"
]
status-date  = "2026-04-23"
```




<<~ ahu #ooda-ha >>
✶ observe: every submodule needs a named lane, but direct imports would couple source truths too tightly.
⏿ orient: adapters should translate resources/tools/prompts while preserving sidecar autonomy.
◇ decide: v1 adapters stay read-only and namespace-scoped; MemPalace demonstrates stdio JSON-RPC sidecar transport.
▶ act: preserve the interface, registry, lane map, and Mempalace operational boundary here.
↺ verify: unsupported writes remain explicit post-v1 residue; adapt: when submodule health fails, the main server should keep running with that namespace absent.
<<~/ahu >>

<<~ &#x0002; >>


<<~ ahu #adapter-interface >>
## Adapter Interface Contract

Every adapter exposes this surface:

```python
class SubmoduleAdapter:
    name: str
    version: str
    contribution_lanes: list[str]

    def health(self) -> dict: ...
    def list_resources(self) -> list[ResourceEntry]: ...
    def read_resource(self, uri: str) -> str: ...
    def list_tools(self) -> list[dict]: ...
    def call_tool(self, name: str, arguments: dict) -> object: ...
```

V1 constraints:

- adapter tools carry `readOnlyHint: true`
- adapter tools carry no write arguments
- failed adapter health does not block server boot
- absent adapters omit their resource and tool prefixes
- each adapter owns one URI prefix and one tool prefix

<<~/ahu >>

<<~ ahu #namespaces >>
## Adapter Namespaces

| Adapter | Resource URI prefix | Tool prefix |
|---|---|---|
| MemPalace | `lar:///submodules/mempalace/` | `lararium-mempalace-*` |
| Kowloon | `lar:///submodules/kowloon/` | `lararium-kowloon-*` |
| Kowloon Client | `lar:///submodules/kowloon-client/` | `lararium-kowloon-client-*` |
| Kowloon Frontend | `lar:///submodules/kowloon-frontend/` | `lararium-kowloon-frontend-*` |
| tldraw | `lar:///submodules/tldraw/` | `lararium-tldraw-*` |
| TiddlyWiki5 | `lar:///submodules/tiddlywiki5/` | `lararium-tiddlywiki5-*` |

The earlier dotted tool-prefix draft has yielded to the dash convention used by current Lararium tools and prompts.

<<~/ahu >>

<<~ ahu #submodule-lanes >>
## Current Submodule Lanes

| Submodule | Pin | Core reading | Near-term lanes |
|---|---|---|---|
| MemPalace | `cef5994` | storage / retrieval substrate | memory resources, retrieval tools, continuity and boot receipt lane |
| Kowloon | `9a9949a` | backend feed / event substrate | activity resources, read-only event tools, social graph fixtures |
| Kowloon Client | `fad027b` | isomorphic client bridge | tool schema examples, client result fixtures |
| Kowloon Frontend | `c51dde3` | operator UI reference | workflow reference, future app alignment |
| tldraw | `4677565` | infinite canvas / render target | visual graph lane, closure trace visualization |
| TiddlyWiki5 | `bcc30e3` | filter language and self-booting graph comparator | guest grammar fixtures, AST/execution comparison corpus |

All current submodules count as core pieces of the MCP program, though not all enter boot required-core.

<<~/ahu >>

<<~ ahu #mempalace-sidecar >>
## MemPalace Sidecar Contract

Lares talks to MemPalace across the MCP protocol boundary rather than importing MemPalace Python modules.
Canonical v1 transport: JSON-RPC over stdio.

Lares responsibilities:

- launch and stop a local sidecar process
- perform `initialize` and `notifications/initialized`
- list and call tools through JSON-RPC
- bound requests with timeouts
- surface JSON-RPC, subprocess, stdout-closure, and tool-level errors as adapter exceptions
- redact memory and diary payloads from routine logs

MemPalace responsibilities:

- run its MCP server loop
- maintain local vector/graph/diary storage
- interpret its config and environment
- return tool lists, schemas, and results

Accepted v1 wrapper groups:

| Lares wrapper | MemPalace tool | Purpose |
|---|---|---|
| `search(query, n_results, drawer)` | `mempalace_search` | semantic memory retrieval |
| `kg_query(entity)` | `mempalace_kg_query` | entity relationship lookup |
| `kg_stats()` | `mempalace_kg_stats` | graph health summary |
| `kg_timeline(entity)` | `mempalace_kg_timeline` | entity or graph timeline |
| `diary_write(entry, tags)` | `mempalace_diary_write` | append diary entry; policy-gated in workflows |
| `diary_read(n_entries, tag)` | `mempalace_diary_read` | read recent diary entries |
| `traverse(start, direction)` | `mempalace_traverse` | navigate palace graph |
| `create_tunnel(source, target, label)` | `mempalace_create_tunnel` | create cross-palace link; policy-gated in workflows |

Implementation landed as `lares/lararium_mcp/adapters/mempalace.py` with mocked subprocess JSON-RPC tests.

<<~/ahu >>

<<~ ahu #registry >>
## Adapter Registry

Server start should build a registry of healthy adapters:

```python
ADAPTER_REGISTRY: dict[str, SubmoduleAdapter] = {}
```

Adapters that pass `health()` register.
Adapters that fail health report a warning and leave their namespace absent.
This keeps core hydration available when a sidecar or submodule breaks.

<<~/ahu >>

<<~ ahu #post-v1-writes >>
## Post-v1 Write Gates

The following remain blocked until explicit policy lands:

- MemPalace boot receipt persistence and broad diary writes
- Kowloon event posting
- tldraw shape placement
- TiddlyWiki tiddler mutation
- any adapter tool whose effect persists outside the server process

<<~/ahu >>


<<~ ahu #edges >>
## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lararium_mcp/spine >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lararium_mcp/ast-execution-render >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lararium_mcp/hydration >>

<<~ pranala #has-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:has >>
<<~ pranala #has-loci ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/loci family:control role:has >>
<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
