> [!IMPORTANT]
> Consumption status: fully-consumed on 2026-04-23.
> Canonical loci-meme: `lar:///ha.ka.ba/@lares/docs/lararium_mcp/spine`.
> This non-meme markdown source may become a safe-delete candidate after link checks confirm no required references remain.

# Architecture Sketch — Lararium MCP

Status date: **April 23, 2026**

---

## Core proposition

The Lararium graph already carries richer semantics than ordinary markdown link structures.
The MCP layer should therefore behave as a hydration engine over the graph and over the repo's current submodule corpus.

The near-term center narrows to:
- one canonical identity/provenance graph
- one hydration compiler
- one submodule adapter layer
- local and remote MCP transports
- one explicit typed-graph stack: identity -> source -> AST -> execution -> render

Architecture work should proceed by refine-consume:
- consume repo truth
- contract into stable interfaces
- expose only the smallest useful surface

---

## Crucible boundary

### In scope

- `lar:///...` graph resolution
- meme, invariant, and memetic-wikitext carrier-tree consumption under `packages/lares-core/memes`
- meme copy-shape, invariant compression, and rating-posture validation
- `loci` derivation and child-item resolution
- `implements` interface-bundle extraction and validation
- boot closure compilation
- submodule integration across all current git submodules
- direct TiddlyWiki Filter Language import
- read-only resources, prompts, and tools
- local stdio and remote HTTP/SSE adapters

### Out of scope for v1

- importing full TiddlyWiki runtime as the system center
- broad repo mutation tools
- ad hoc client-specific prompt scaffolds that bypass compiler output

---

## Proposed stack

```text
repo loci + pranala graph + meme/invariant/memetic-wikitext carrier trees + current submodules
        ↓
edge typing + submodule contribution typing
        ↓
hydration compiler core
        ↓
typed graph stack
  - identity / provenance graph
    - loci
    - pranala sockets and typed edges
  - source carriers
  - interface bundles declared through `implements`
  - syntax / AST graphs
  - execution / widget / entity graphs
  - render projections
        ↓
compiled artifacts
  - minimal boot
  - full boot
  - boot receipt
  - closure trace
  - submodule attachment map
        ↓
submodule adapter layer
        ↓
MCP exposure layer
  - resources
  - prompts
  - tools
        ↓
clients
  - VS Code / Copilot Agent mode
  - Claude Code
  - Codex
  - ChatGPT developer mode / API
```

---

## Submodule contribution model

Every current submodule must contribute a named lane.
Current working map:

| Submodule | Contribution lane | Near-term MCP role |
|---|---|---|
| `mempalace` | storage / retrieval | memory substrate resources and tools |
| `kowloon` | backend / event / social feed | activity and feed resources / tools |
| `kowloon-client` | client bridge | adapter and call surface for Kowloon operations |
| `kowloon-frontend` | operator UI reference | workflow examples, UI semantics, future MCP app alignment |
| `tldraw` | visual graph / canvas | render target, MCP app lane, graph visualization |
| `tiddlywiki5` | guest grammar source | direct Filter Language import and self-booting example graph |

See `SUBMODULE_INTEGRATION_MATRIX.md`.

---

## Meme, invariant, memetic-wikitext, and loci consumption

The Lararium already carries a lawful source corpus under `packages/lares-core/memes`:
- primary memes at stable derived filepaths
- copy-shape law and rating posture at `lar:///ha.ka.ba/@lares/api/v0.1/pono/meme`
- invariant compression and sidecar boundary at `lar:///ha.ka.ba/@lares/api/v0.1/pono/invariant`
- child items under sibling directories named for the parent terminal segment
- a bounded primitive cluster at the memetic-wikitext root
- promotion/rating pressure through `meme` and `loci` law

That means the MCP compiler should not start from arbitrary markdown files.
It should start from lawful carriers that already declare:
- doctype and carrier identity
- minimum meme copy-shape surfaces and rating posture
- invariant pressure surfaces and cacheability expectations
- composable interface claims through `implements`
- `#iam` metadata
- stable file-path derivation
- child-tree growth rules
- primitive families such as `ahu`, `loulou`, `aka`, `kahea`, `kapu`, `ui`, `hana`, and `?`

Working consume order:
1. resolve `lar:` identity through `loci` derivation
2. validate meme copy-shape, invariant pressure, rating posture, and declared depth state
3. extract and validate the `implements` interface bundle
4. inventory parent carrier and child-item tree
5. parse memetic-wikitext primitives into source/AST nodes
6. lower typed edges through `pranala` law
7. lower execution and render projections

Compiler artifacts should therefore include both:
- graph-facing closure artifacts
- tree-facing carrier indexes and child-resolution tables

---

## Pranala alignment

The repo already carries a stronger edge law than ordinary markdown links.
Local invariant pressure from `lar:///ha.ka.ba/@lares/api/v0.1/pono/pranala` gives the host graph:
- typed families
- explicit `from` and `to` sockets
- DAG pressure by family
- independent traversal and propagation
- explicit lifecycle roles such as `owns`, `references`, `composes`, `constrains`, and `implements`

That means the Lararium should not treat `pranala` as decorative link sugar.
It should compile `pranala` into first-class graph edges that survive across graph layers.

Working lowering read:

| Pranala family | Host graph role | TiddlyWiki parallel | Unreal / Scene Graph parallel |
|---|---|---|---|
| `relation` | identity / semantic adjacency | tiddler reference / transclusion adjacency | entity reference / prefab adjacency |
| `control` | execution ownership and lifetime | startup order / root-widget ownership | parent-child entity hierarchy and lifetime control |
| `dataflow` | live value or view transport | transclusion / widget-fed value flow | component-fed runtime state or transform flow |
| `message` | event route | widget message bubbling | event or signal routing across entity graph |
| `constraint` | declarative rule edge | parser or render constraint | layout / physics / rule constraint over entities |
| `observe` | inspection / shadow reveal | shadow transclusion / refresh watch | editor inspection, debug overlays, observer tools |

The strongest structural alignment currently reads this way:
- `pranala` supplies the host edge spine
- AST nodes supply syntax structure
- execution nodes supply widget-like or entity-like runtime structure
- render projections lower into DOM, tldraw, or future Scene Graph targets

For Unreal-style alignment, `control role:owns` should act as the nearest host parallel to parent-child entity hierarchy.
`dataflow`, `message`, `constraint`, and `observe` should then layer as non-owning graph relations over the owned hierarchy instead of collapsing into the same edge type.

---

## Resource model

Candidate canonical resources:

- `lar:///AGENTS`
- `lar:///LARES`
- `lar:///boot/minimal`
- `lar:///boot/full`
- `lar:///boot/receipt`
- `lar:///graph/closure?entry=lar:///AGENTS&mode=full`
- `lar:///trees/carriers`
- `lar:///trees/carriers/{uri}`
- `lar:///interfaces/by-carrier/{uri}`
- `lar:///interfaces/by-interface/{uri}`
- `lar:///resolution/lar-uri?uri=...`
- `lar:///INDEXES/carriers`
- `lar:///INDEXES/interfaces`
- `lar:///INDEXES/invariants`
- `lar:///submodules/matrix`
- `lar:///submodules/<name>/...`

Annotations should likely carry:
- audience
- priority
- lastModified

### Root namespace posture

The resolver should treat root shapes as first-class law, not incidental filenames:

| Root shape | Example | Resolution posture |
|---|---|---|
| all-caps file root | `lar:///AGENTS`, `lar:///LARES` | file-backed root under `lares/` |
| all-caps virtual root | `lar:///INDEXES/carriers` | compiler-produced namespace; child paths may use any case |
| stable tuple root | `lar:///ha.ka.ba/@lares/api/v0.1/pono/meme` | stable local root under `packages/lares-core/memes/` |
| future unstable tuple root | `lar:///*.*.*/...` | unstable local root under `lares/chapel-perilous-opens/<root>/` |

`lar:///INDEXES/**` does not need a one-to-one disk file. It names materialized compiler resources.

---

## Prompt model

Candidate prompts:
- `lararium.hydrate_full`
- `lararium.boot_minimal`
- `lararium.boot_receipt`
- `lararium.resolve_uri`
- `lararium.inspect_submodule`
- `lararium.compare_hydration`

---

## Tool model

Candidate v1 tools:
- `resolve_lar_uri`

Initial dependency-light stdio binding lives at:

```bash
python3 -m lares.lararium_mcp
```

It currently exposes:
- `resources/list`
- `resources/read`
- `resources/templates/list`
- `tools/list`
- `tools/call`
- `read_locus`
- `read_carrier_tree`
- `compile_loci_index`
- `read_interface_bundle`
- `compile_interface_index`
- `hydrate_lararium`
- `compile_boot_receipt`
- `inspect_submodule`
- `diff_hydration`

Candidate v1 policy:
- read-only tools only
- explicit `readOnlyHint`
- strong descriptions with “Use this when...”

---

## TiddlyWiki boundary

The current plan imports **TiddlyWiki Filter Language directly** as guest grammar and as a primary self-describing / self-booting graph exemplar.
The current plan does **not** elevate full TiddlyWiki runtime boot, UI, or storage semantics into the Lararium's constitutional center.

That means:
- Filter Language enters through the existing guest-grammar law surface.
- TiddlyWiki5 contributes source grammar, fixtures, and comparison behavior.
- Lararium keeps its own graph, metaphysics, and hydration law.
- self-booting graph lessons get consumed into host contracts rather than copied wholesale
- TiddlyWiki's `text -> parse tree -> widget tree -> DOM` stack now serves as the main comparative pattern for Lararium `source -> AST -> execution -> render`
- Unreal-style Scene Graph now supplies the main comparative pattern for owned execution hierarchy and multi-target projection beyond the DOM

---

## Transport split

### Local

- stdio
- workspace-root aware
- IDE-first
- sandbox-friendly

### Remote

- Streamable HTTP or HTTP/SSE
- auth + approvals
- remote API / ChatGPT capable
