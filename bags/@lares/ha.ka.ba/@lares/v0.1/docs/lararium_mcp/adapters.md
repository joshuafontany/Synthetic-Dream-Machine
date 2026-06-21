<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/lararium_mcp/adapters >>
```toml iam
file-path       = "bags/@lares/ha.ka.ba/@lares/v0.1/docs/lararium_mcp/adapters.md"
mana            = 16
manao           = 17
manaoio         = 15
register        = "Synthesis-Canon"
role            = "canonical submodule adapter and sidecar integration contract for Lararium MCP"
source-consumes = ["packages/lares-core/memes/docs/mcp/SUBMODULE_ADAPTER_INTERFACE.md", "packages/lares-core/memes/docs/mcp/SUBMODULE_INTEGRATION_MATRIX.md", "packages/lares-core/memes/docs/mcp/mempalace.md", "packages/lares-core/memes/docs/mcp/subtasks/MCP-SUBTASK-007_MEMPALACE_LANE.md"]
status-date     = "2026-04-23"
tags      = ["api/pono/meme", "api/pono/loci"]
l-space         = "stable"
type            = "text/x-memetic-wikitext"
uri-path        = "ha.ka.ba/@lares/v0.1/docs/lararium_mcp/adapters"
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

<<~ ahu #bearing-harvest >>

## MemPalace Bearing-Harvest (talk-story moʻolelo, 2026-06-21)

The first corpus MemPalace holds is the live agent↔operator sessions themselves. Each turn already speaks its bearing in the `<<~ lares aim … >>` / `<<~ lares yield … >>` frame, so MemPalace receives no new address schema — it **harvests** the bearing each turn already carries. The harvest degrades gracefully: not every turn wears the frame, and a drifted `lar:` URI reads as signal, never as error.

<<~ talk-story #mempalace-lar-schema ground:"the 4-tier palace (wing·room·hall·drawer) read against lar: URI law" >>
<<~ moolelo held:"harvest the turn's lar: bearing-vector; the full lar: namespace IS the tag space — no single 'palace' root collapses it (operator)" >>
- **Grain** — the turn (≈ one assistant message; the sweeper keeps a message whole, `sweeper.py`). Sub-claim grain (inner `confidence` / `ward`) defers to its own epic.
- **Ground** — the verbatim drawer always stands (GroundedVow); the bearing index rides over it as a lossy projection, never a gate on storage.
- **Gradient** — `aim → yield` reads as a span, not a point; it maps onto temporal validity (`valid_from` = turn-open, `valid_to` = turn-close).
- **Drift preserved** — a dropped frame or a two-/four-term root harvests at low confidence with its raw form intact, never corrected. The node cannot read its own drift, so the harvest keeps it readable for the keeper.
- **Never normalize at the floor** — canonicalize only at promotion (working→canon into Lararium). MemPalace keeps testimony as spoken; the meme-`normalize` rule does not reach this floor.
- **Bridge** — the bearing joins MemPalace (what we *said* at a bearing) to Lararium canon (what we *hold* there) over one shared `lar:` namespace.
<<~/moolelo >>
<<~ moolelo held:"WHERE the bearing lives = packages/ as isomorphic causal-island web3 code, NOT the mempalace submodule (operator law: no code enters submodules; mempalace stays a READ-ONLY sidecar)" >>
The 4-lens swarm converged on a `bearings` table inside mempalace's `knowledge_graph.sqlite3` — but it answered a MIS-FRAMED fork: the packages-vs-submodule boundary was never put to it, so its in-mempalace verdict is VOID on locus (it would edit the submodule). The harvest is Lararium-side bridge machinery — it READS verbatim drawers across the read-only sidecar boundary and writes bearings to the Lararium's own web3 substrate, never into mempalace.
What TRANSPOSES, substrate-independent, to the web3 side:
- **Raw, never normalized** — aim/yield URIs stored verbatim, byte-stable; drift survives.
- **Append-only, keyed per turn** — never deduped on `(aim, yield)`; the aim→yield gradient across turns survives.
- **Confidence grades DOWN for drift** — an ungraded bearing never reads as trusted; the drift-trend is the keeper's gauge.
- **Gradient = a temporal span** (turn-open → turn-close).
- **Canon only at promotion** — drift lives in the working event-log; only blessed bearings graduate working→canon.
<<~/moolelo >>
<<~ hoike #web3-substrate held:"the packages/ home (which bag/CRDT, the TS isomorphic shape, how the read-only sidecar feeds the harvest) stays PROPOSED until a packages/ scout grounds it" >>
re-entry: the packages/ scout, then a re-ruling on the web3 side
<<~/hoike >>
<<~/talk-story >>

Residue: the namespace table above still reads `lar:///submodules/mempalace/` — a one-term root by the arity law. Re-founding it on a three-term bearing root awaits a separate pass; flagged here, not yet enacted.

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

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
