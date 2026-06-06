<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/pono/research-streams/gaps-tensions >>
```toml iam
uri-path  = "ha.ka.ba/@lares/v0.1/docs/pono/research-streams/gaps-tensions"
file-path = "bags/@lares/v0.1/docs/pono/research-streams/gaps-tensions.md"
type      = "text/x-memetic-wikitext"
tagspace  = "stable"
register  = "Synthesis"
mana      = 15
manao     = 15
role      = "living catalogue of memetic-wikitext gaps, tensions, and conflicts — design-history record; open items sync to the submission Annex B"
cacheable = false
retain    = false
invariant = false
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ &#x0002; >>

<<~ ahu #head >>

# Gaps, Tensions, and Conflicts — Living Catalogue

The design-history record for memetic-wikitext. Each entry tracks a gap (missing capability), tension (two correct pulls in friction), or conflict (a hard incompatibility). Resolved entries stay as the record of how the resolution landed; open entries sync to the submission's **Annex B** (`lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext#annex-open`).

Family assignments here read post the 2026-06-05 transclusion reorg: `aka` (frozen) and `kahea` (live) carry **`family:transclusion`**, not the older observe / dataflow assignments. `wai` retired into `heihei`.

<<~/ahu >>

<<~ ahu #gaps >>

## Gaps

### Gap 1 — `message` and `constraint` family sugars — RESOLVED

Both families register in the grammar meme `[[families]]` array (M7). Routing lives at `docs/pono/message-routing`. `family:constraint` → `pono` registered as `[SC]` edge-sugar (compile layer). Distinction from `kapu`:
- `kapu` = boundary **posture** at the render surface (qualification, confidence, unresolved threshold)
- `pono` = structural **rule assertion** in the compiled graph (must-hold invariant, no execution pulse)

`family:message` → `lele` covers fire-and-forget runtime dispatch; explicit `pranala` covers structural edges. `hau` deferred — no current pressure for dedicated inline message-routing sugar.

### Gap 2 — `hana` / `kapu` / `ui` registration — RESOLVED

All three register in the grammar meme (2026-04-27), alongside `meme`, `mukuwai`, `kahawai`, `huli`, `wehe`, `helu`, the English aliases, and the concurrency sigils. *(The conditional alias `wai` from this pass later retired into `heihei`.)*

### Gap 3 — `layer` field in the sigil registry

**Problem:** the grammar meme does not distinguish compile-time from render-time sigils; a naïve parser might extract `wehe`/`huli`/`heihei` as graph edges at boot.

**Resolution:** add `layer = "compile" | "render" | "both"` to each `[[sigils]]` entry. Edge sigils (`aka`, `kahea`, …) get `both`; definition / conditional sigils get `render`; `ahu`, `iam`, `? ->` get `compile`.

### Gap 4 — Pragma `<<~!` dispatch — RESOLVED

The boot compiler IGNORES `<<~!` blocks — they produce no compile-time artifact; render-time interpreters handle them. Correct by the dual-layer model: pragma blocks read render-only. No compile-layer parser change needed.

### Gap 5 — Verse `suspends` / `kukali` (reactive wait inside a causal island)

**Status:** design sharpened (2026-04-28); `kukali` candidate sigil; blocked on async `ReactionGraph`.

`suspends` marks an expression that yields its causal island until an event fires — the *wait posture inside an island*, distinct from `papalohe` (the inter-island wire) and `hui`/`holo`/`puka` (parallel-island coordination). Each `kumu` instance reads as an isolated async boundary; events cross only via declared `papalohe` edges; within an island `kukali` yields until the subscribed event fires — isomorphic to `await` on a `Promise`. `ReactionGraph.fire()` must return `Promise<void>` before `kukali` carries semantics (a sequencing requirement, not a gap). Candidate: `<<~ kukali trigger:OnBegin >>` (inline) or block form (body resumes on fire).

### Gap 6 — UEFN `prop` vs `kumu`

**Status:** unregistered, low priority. UEFN names `creative_device` (interactive, event-capable) and `prop` (static geometry, no events). `kumu` covers `creative_device`; a `prop` reads as a typed world object with no reactive surface — candidate `kumu kind=prop` convention or a dedicated sugar. Defer to the UEFN projection milestone.

### Gap 7 — Verse module access modifiers

**Status:** convention proposed, not a sigil. Verse `public`/`internal`/`private` map to `<<~ kapu qualifier:public|internal|private >>`. Register as a `kapu` attrs convention note, not a new sigil.

### Gap 8 — parse → widget → DOM, the middle layer

**Status:** design resolved (2026-04-28); implementation pending. TW5 runs three trees: parse → widget → DOM, where the widget tree bears execution. Lararium holds the parse tree (`MemeAstNode[]`) and the render tree; the **widget tree** stays pending. `kumu` declares the widget-tree node type (≈ TW5 `\widget`); a `kahea` name-form call resolves at widget-build time against the `KumuRegistry` into a `WidgetNode`. A `kumu` type reads as a UEFN `creative_device` (`@editable` props via `kau`, event ports via `papalohe`, a causal-island boundary). Target pipeline: `carrier text → MemeAstNode[] (parseMemeCarrier, done) → WidgetNode[] (resolveWidgetTree, pending) → output (pending)`. The stage axis lives at `render-pipeline#render-axes`.

<<~/ahu >>

<<~ ahu #tensions >>

## Tensions

### Tension 1 — `aka`: "passive inclusion" vs "frozen transclusion"

An older docs guide warned "avoid treating `aka` as implying live invocation." Correct but incomplete: `aka` performs frozen (shadow) transclusion — it carries **`family:transclusion`** pressure with read-only render-time embedding, not pure passivity. The sharp statement: `aka` = frozen (read-only, non-propagating); `kahea` = live (subscription-fresh, propagating). The distinction reads as propagation and fidelity, not presence/absence of transclusion. Both sit in the `transclusion` family (page surface), distinct from `dataflow` value-wires (canvas).

### Tension 2 — compile-time cycle detection vs render-time recursion guard

Both must hold. The compile-time DAG guard (control cycles) does not prevent render-time recursion via `aka`/`kahea`; a cycle-free graph can carry mutual live transclusion. See `memetic-wikitext#recursion-guard`.

### Tension 3 — `<<~!` pragma scope: carrier-local vs global

`wehe`/`helu` definitions read carrier-local by default. Invariant-meme definitions may want global visibility via `<<~ aka lar:///carrier >>` (frozen transclusion brings in the definition namespace). Open: does the compiler parse `wehe`/`helu` inside `aka`-referenced carriers to build a definition index?

### Tension 4 — `kahea` dual dispatch — RESOLVED

`kahea` carries two parse-time paths:
- **URI form** (`lar:///…`, or a path with `/`/`#`) → `EdgeSugarNode { sigil:"kahea", family:"transclusion" }` — compile-time transclusion edge + render-time live embed.
- **Name form** (plain identifier, optionally `name(args)`) → `SigilNode { sigilName:"kahea", attrs:{ name, args } }` — render-only, no graph edge.

The parser matches URI form first (anchored on `lar:` or the presence of `/`/`#`); name form catches the rest. A `wehe` parameter interpolation resolves as name form. **Invariant:** the compile layer never sees a malformed transclusion edge for a plain-name target.

### Tension 5 — inline filter vs `hana` block

`heihei`/`huli`/`ui` accept filter expressions inline; `hana` requires a block. Both parse to the same semantics — multi-line filters use `hana`, one-liners use the inline form.

<<~/ahu >>

<<~ ahu #conflicts >>

## Conflicts

### Conflict 1 — bare `<<name>>` — DISSOLVED (no conflict)

Memetic-wikitext reads as a **superset of TW5 wikitext**: the custom parser accepts TW5 macro calls `<<macroName>>` as inherited, valid syntax. The sharktooth `<<~ … >>` adds the Lararium sigil namespace *within* the `<<` `>>` family — it does not displace TW5 macros. The two forms coexist; no conversion required. *(The earlier "must convert" framing mistook the superset for a conflict.)*

### Conflict 2 — TW5 `{{Title||Template}}`

Simple transclusion `{{Title}}` maps to `<<~ kahea lar:///uri >>`. Template transclusion has no single-sigil form — it composes two: `<<~ meme lar:///uri >>` (bind the target as context) then `<<~ kahea lar:///template >>` (render the template against it). Authors SHOULD prefer the explicit `meme`+`kahea` pair over a hypothetical single form.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >>
<<~ pranala #tracks-annex ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext family:observe role:references >>
<<~ pranala #implements-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:has >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
