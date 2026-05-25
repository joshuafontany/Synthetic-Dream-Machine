<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext-spec >>

```toml iam
uri-path     = "ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext-spec"
file-path = "bags/@lares/v0.1/api/pono/memetic-wikitext-spec.md"
type         = "text/x-memetic-wikitext"
tagspace     = "stable"
confidence   = 18
register     = "SC"
mana         = 18
manao        = 18
role         = "holistic grammar specification — outer delimiter system, full sigil registry, TW5 parity map, dual-layer model, six families, recursion guard, gaps and tensions"
cacheable    = true
retain       = true
invariant    = false
```


<<~ ahu #ooda-ha >>
✶ read pranala invariant law first — `aka` is shadow transclusion, `kahea` is live transclusion; the six families carry this.
⏿ orient around the dual-layer model: every sigil carries both compile-time graph structure AND render-time semantics; these are not separate.
◇ design the missing sigils (definition, conditional, iteration, context-focus) — these close the TW5 parity gap that the edge primitives cannot cover.
▶ write the holistic spec: outer-delimiter dispatch, full sigil + family registry, dual-layer model, recursion guard, tensions table.
⤴ verify every TW5 concept has a named Lararium equivalent or an explicit deferral with rationale.
↺ name conflicts precisely; a gap left implicit will silently corrupt authoring practice.
<<~/ahu >>

<<~&#x0002;>>


<<~ ahu #purpose >>

# Memetic-Wikitext Grammar Specification

This carrier is the holistic grammar spec for `text/x-memetic-wikitext`.

**Not** the grammar kernel (`lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext` holds the live TOML registry).
**Not** the invariant law (`lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext` holds the root).
**Not** the pranala edge law (`lar:///ha.ka.ba/@lares/v0.1/api/pono/pranala` holds the edge contract).

This carrier holds: the full design space, the outer-delimiter dispatch table, the complete sigil
inventory against TW5, and the explicit gaps and tensions that authors and parsers must navigate.

TiddlyWiki5 is the **Level 19 confidence core model**. Where a TW5 construct has no Lararium equivalent,
the gap is named and either a new sigil is proposed or deferral is stated with rationale.

**Key correction vs. naive TW5 mapping:** `aka` and `kahea` are NOT purely compile-time graph edges.
The pranala invariant law defines them as bearing transclusion pressure:
- `aka` = shadow transclusion (`family:observe`)
- `kahea` = live transclusion (`family:dataflow`)
Every edge sigil carries BOTH a compile-time graph record AND a render-time semantic directive.
The missing TW5 features are definition, context-focus, and conditional/iteration — not transclusion.

<<~/ahu >>

<<~ ahu #outer-delimiter-system >>

## Outer Delimiter System

The `<<` `>>` angle-bracket pair is the outer delimiter family for all active sigils.

### Dispatch table

| Prefix | Mode | Examples |
|--------|------|---------|
| `<<~` | Lararium sharktooth — primary sigil mode | `<<~ ahu #id >>`, `<<~ aka lar:///uri >>` |
| `<<~/` | Sharktooth close — ends a block sigil | `<<~/ahu >>`, `<<~/define >>` |
| `<<~!` | Pragma mode — definition sigils (`\define` / `\procedure` / `\function` equivalents) | `<<~! define name(params) >>` |
| `<<~?` | Unresolved-pressure mode | `<<~? #fragment >>` (open question worksite) |
| `<<~&#x0001;` | Document header control character | file-level header edge |
| `<<~&#x0004;` | Document footer control character | file-level footer edge |
| `<<` *(bare)* | **Reserved.** Not currently valid Lararium syntax. TW5 macro-call compat deferred. | — |

### The sharktooth mark

`~` is the sharktooth. It marks the Lararium sigil namespace inside the `<<` family.
All Lararium-authored content uses `<<~`. Bare `<<name>>` is not valid syntax today.

### Block vs. inline sigils

- **Inline** (self-closing): `<<~ loulou lar:///uri >>`
- **Block** (with close): `<<~ ahu #id >>` ... `<<~/ahu >>`
- **Pragma block** (`<<~!` mode, with close): `<<~! define name >>` ... `<<~/define >>`

### Fragment notation

`#fragment-id` after a sigil name creates an addressable anchor. Ahu blocks always carry one.
Edge sigils carrying a `#fragment` name the outgoing slot on the enclosing ahu.

<<~/ahu >>

<<~ ahu #dual-layer-model >>

## Dual-Layer Model — The Central Architecture

Every sigil in memetic-wikitext operates on **both layers simultaneously**.
This is the correct model. "Compile-time graph structure" and "render-time semantics" are not
separate layers with separate sigil sets — they are two readings of the same surface.

```
┌──────────────────────────────────────────────────────────────────────┐
│ COMPILE-TIME READING  (graph, boot closure, index)                   │
│                                                                      │
│  Every sigil produces graph artifacts:                               │
│  ahu → worksite node / fragment anchor                               │
│  pranala/loulou/aka/kahea → PranalaEdge records                        │
│  iam → carrier metadata                                              │
│  ? -> → DAG socket edge                                              │
│                                                                      │
│  Output: MemeGraph, BootArtifact, boot receipt                       │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ same sigils, second reading
┌────────────────────────────▼─────────────────────────────────────────┐
│ RENDER-TIME READING  (content projection, embedding, evaluation)     │
│                                                                      │
│  Edge sigils carry render directives:                                │
│  aka   → shadow transclusion: pull target content as shadow embed    │
│  kahea → live transclusion: embed target content inline              │
│  loulou → relation link: render as navigable reference              │
│  hana  → guest grammar execution block                               │
│  ui    → query: render filter result as meme list                   │
│                                                                      │
│  Definition sigils (pragma mode) add:                                │
│  wehe / \procedure / \define → named wikitext form                  │
│  helu / \function → named filter-expression function                 │
│  kahea / \transclude → summon URI or named definition                │
│  meme / \tiddler → context binding (<$tiddler> equivalent)           │
│  wai/mukuwai/kahawai → conditional rendering [C]                     │
│  huli → iterative rendering [SC]                                     │
│  hui/heihei/puka/lele → concurrency coordination [SC]               │
│                                                                      │
│  Output: rendered views (canvas shapes, HTML, chat, etc.)            │
└──────────────────────────────────────────────────────────────────────┘
```

**The important rule:** `aka` and `kahea` carry transclusion pressure. They are not "just graph edges."
When a renderer encounters `<<~ kahea lar:///uri >>`, it SHOULD embed that meme's content inline
(live transclusion). When it encounters `<<~ aka lar:///uri >>`, it MAY pull in a shadow copy
(read-only, lower fidelity, like a TW5 shadow tiddler or footnote reference).

<<~/ahu >>

<<~ ahu #ast-node-types >>

## AST Node Types

The parse-time AST (`MemeAstNode` union, `packages/lararium-mesh/src/ast.ts`) uses 8 node kinds.
Everything that is not an edge or scope boundary collapses into `SigilNode { sigilName, attrs, body }`.

| Node kind | Covers | Notes |
|-----------|--------|-------|
| `Worksite` | `ahu` | addressable scope socket; `uri = carrierUri + slot` |
| `Edge` | `pranala` (block + inline) | typed edge; `family`, `role`, `slot` |
| `EdgeSugar` | `loulou` / `aka` / `kahea` / `pono` / `papalohe` | sugar edge; `sigil`, `family`, `trigger` (papalohe only) |
| `Dispatch` | `lele` | fire-and-forget; `family: "message"` |
| `CarrierHeader` | `<<~ ? -> URI >>` | carrier self-edge; `toUri` |
| `Text` | raw wikitext spans | `content` string |
| `Sigil` | all canonical non-edge sigils | `sigilName`, `attrs` bag, `body[]` |
| `Dynamic` | grammar-meme-registered unknown sigils | escape hatch; `sigilKind`, `eventType` |

**`SigilNode` attrs by sigilName:**

| sigilName | attrs keys |
|-----------|------------|
| `wai` / `kahawai` / `ui` | `filter` |
| `huli` | `filter`, `binding` |
| `hana` | `grammarKey` |
| `meme` | `targetUri` |
| `wehe` / `kumu` | `name`, `params` |
| `helu` | `name`, `params`, `expression` |
| `kau` | `name`, `value`, `scope` (see scope principles below) |
| `kapu` | `qualifier`, `inline` |
| `toml` / `iam` | `content` |

**`kau` scope:** `<<~! kau name = val >>` (pragma → `scope:personal`) vs `<<~ kau name = val >>...<<~/kau >>` (block → `scope:collective`). The `!` is the scope elevation marker. See `#scope-principles` for the full five-value ladder.

**`kumu` vs `wehe`:** `kumu` declares a new element type (grammar node with declared body contract). `wehe` declares a text/content template (wikitext fragment). Different body contracts, different `sigilName` — both collapse to `SigilNode`.

<<~/ahu >>

<<~ ahu #scope-principles >>

## Scope Principles

State in lararium has five principled scopes. These are *principles*, not techniques — implementation forms (circle IDs, group IDs, session tokens) are derived from them.

| scope | boundary | who controls the boundary | Kowloon ground |
|-------|----------|--------------------------|----------------|
| `ephemeral` | one agent turn / recipe execution | nobody — evaporates | no Kowloon object |
| `personal` | one actor, persistent | the actor alone | `to: @<domain>` (auth-required) |
| `consensual` | shared by mutual choice | author gates; reader assembles | `to: circle:<id>` (Kowloon Circle) |
| `collective` | shared by group identity | group governance (tiers) | `to: group:<id>` (Kowloon Group) |
| `universal` | no gate | no one — federated | `to: @public` (Kowloon federation) |

**The Kowloon inversion:** Kowloon inverts the social graph — circles are *your* data structure, not the platform's. You follow someone *into a circle you own*. The author's `to: circle:<id>` gates who sees a post; the reader's Following circle gates what lands in their feed. Neither side sees the other's structure. This is the model behind `consensual` scope.

**`kau` scope values:** `ephemeral` | `personal` | `consensual` | `collective` | `universal`. Parse-time shorthands `carrier` (→ `personal`) and `block` (→ `collective`) are retained for compatibility.

**`kapu` qualifier:** A `kapu` block may carry a scope principle name as its qualifier to gate rendering by scope. `<<~ kapu collective >>...<<~/kapu >>` renders only when the active scope is `collective` or wider.

**Lararium as Kowloon node:** A lararium node is (or connects to) a full Kowloon server. A lararium room is a Kowloon Group. The canvas, circles, and membership tiers are all live Kowloon state — the lararium UI renders them as visual graphs.

<<~/ahu >>

<<~ ahu #eight-families >>

## Eight Pranala Families

All eight families registered in the grammar meme `[[families]]` TOML array and in `KNOWN_FAMILIES`/`FAMILY_CONTRACTS` in `pranala-parser.ts`.

| Family | Sigil sugar | Render semantic | Compile semantic |
|--------|-------------|-----------------|------------------|
| `relation` | `loulou` | navigable link, no auto-embed | semantic / ontological edge |
| `control` | (none — explicit pranala only) | structural ownership | DAG must hold |
| `dataflow` | `kahea` | **live transclusion** | typed value / geometry transport |
| `observe` | `aka` | **shadow transclusion** | live inspection / reveal |
| `message` | `lele` | fire-and-forget dispatch | signal passage, no ownership |
| `constraint` | `pono` | declarative rule assertion | structural invariant, no exec pulse |
| `reaction` | `papalohe` | triggered response — fires when source activates | UEFN device graph event wire; trigger at source, fn at target; renderMode: reaction-wire |
| `spatial` | (pending) | containment / portal / adjacency | infinite canvas + RPG multi-level; roles: contains \| portal \| adjacent \| layer |

**`papalohe`** — Lua tradition: *pāpālohe* — warrior body-listening reflex. The edge fires only when the source event activates it.

**Full UEFN wire:** `<<~ papalohe DeviceA -> DeviceB trigger:OnEliminated fn:ShowScore >>`
- `trigger` — source event name (e.g. `GuardPost.OnEliminated`)
- `fn` — target function name (e.g. `HUD.ShowScore`)
- `role` — canonical values: `subscription` | `handler` | `callback` (warning if absent)
- `renderMode` — always `reaction-wire` for papalohe; renderer places trigger label at source arrowhead, fn label at target

**OODA-HA loop for a papalohe edge:**

| Phase | Layer | Operation |
|-------|-------|-----------|
| Observe | wikitext surface | operator writes `<<~ papalohe A -> B trigger:OnElim fn:Show >>` |
| Orient | `parseMemeCarrier` | → `EdgeSugarNode { trigger, fn }` |
| Decide | `edgesFromAst` | → `PranalaEdge { family: "reaction", payload: { trigger, fn }, renderMode: "reaction-wire" }` |
| Act | Verse/UEFN runtime | `DeviceA.OnEliminated.Subscribe(agent => DeviceB.ShowScore(agent))` |
| Aftermath | `validatePranalaEdge` | warn if no role; loop closes; state change feeds back to Observe |

The wire (`papalohe`) belongs to Orient phase — a named shape in the graph. The execution (`suspends`/`kukali`, Gap 5) belongs to Act phase. Different phases, different sigils.

**Stance lenses on a papalohe edge:**

Each posture reads the same edge differently — the stance sets what the register measures, the tool sets the aperture.

- `*!` (external/narrow — Philosopher's natural posture): reads the specific wire — "A.OnEliminated causes B.ShowScore" — propositional commitment, detail view
- `*?` (external/wide — Poet ranging): reads the reaction topology — which devices react to which across the carrier
- `~!` (internal/narrow — Satirist targeting): reads what does NOT have a handler — the absent reactions, missing subscribable, unmatched listenables (P6: the void the targeting produced)
- `~?` (internal/wide — Private reflecting): reads what the reaction does to B's internal state when it fires
- `?` (Cup/Humorist): holds A and B as reaction partners — does this coupling fit? does ShowScore make sense after OnEliminated?

**Rendering loop:**

The canvas render layer reads `PranalaEdge.renderMode`. For `"papalohe"`:
1. Draw directed arrow A → B
2. Label source end with `payload.listenable` (if set)
3. Label target end with `payload.subscribable` (if set)
4. Apply reaction family visual treatment (distinct from control/dataflow arrows)
5. `role` value surfaces as edge tooltip or secondary label

Posture-aware render: `*!` posture shows listenable/subscribable detail labels; `*?` posture renders topology only (device names, no labels); `~!` posture highlights edges with missing subscribable (Satirist reads the gap).

### Shadow vs. Live Transclusion

`aka` (shadow, observe family):
- Read-only embed of target content
- Shown at lower fidelity or as a locked/quoted section
- Target can be overridden locally without breaking the source
- TW5 analog: shadow tiddler reference; `$:/` core content rendered in a journal entry

`kahea` (live, dataflow family):
- Inline embed; target content rendered as-is at the call site
- Changes to target propagate live to all `kahea` sites
- Like TW5's `{{Title}}` inline transclusion
- Push-forward propagation: changes at source push forward to all `kahea` dependents

### Recursion guard applies to both

Both `aka` and `kahea` at render time add the target URI to the render stack.
The recursion guard model (see `#recursion-guard`) applies equally to both.

<<~/ahu >>

<<~ ahu #structural-sigils >>

## Structural Sigils

### `ahu` — worksite scope boundary

```
<<~ ahu #fragment-id >>
  ... body ...
<<~/ahu >>
```

Creates an addressable scope. All other sigils that carry a `#fragment` name the outgoing slot
on the enclosing ahu. `ahu #iam` is the special identity block — always the first ahu in a carrier.

### `iam` — carrier identity block

Special form of `ahu`. Contains TOML metadata. Must be first. Not repeated.

### Header / footer edge (`? ->`)

```
<<~&#x0001; ? -> lar:///canonical-uri >>   ← file header
<<~&#x0003;>>
<<~&#x0004; -> ?                        >>   ← file footer
```

Document-level DAG sockets. Required in well-formed carriers.

<<~/ahu >>

<<~ ahu #edge-sigils >>

## Edge Sigils — Graph + Render Dual-Layer

All edge sigils produce compile-time `PranalaEdge` records AND carry render-time directives.

### `pranala` — full edge declaration

```
<<~ pranala #slot ? -> lar:///uri family:control role:implements >>
```

Full form. Use when sugar forms do not carry enough precision.
Six families available. Block form carries TOML payload.

### `loulou` — relation link (`family:relation`)

```
<<~ loulou lar:///uri >>
```

Outgoing semantic link. No auto-embed. Renders as a navigable reference.

### `aka` — shadow transclusion (`family:observe`)

```
<<~ aka lar:///uri >>
```

Shadow transclusion. Renderer pulls in target content as a read-only shadow embed.
TW5 analog: shadow tiddler inclusion; cited/quoted content; locked reference block.
**Not** a pure graph edge — carries transclusion pressure at render time.

### `kahea` — live transclusion (`family:dataflow`)

```
<<~ kahea lar:///uri >>
```

Live transclusion. Renderer embeds target content inline, push-forward propagation.
TW5 analog: `{{Title}}` inline transclusion.
**Not** a pure graph edge — carries live transclusion pressure at render time.

### `kapu` — qualification and boundary posture

```
<<~ kapu confidence:0.7 >>
<<~ kapu invocation -> bounded|? >>
```

Qualifies the current worksite: confidence, restriction, boundary, or unresolved posture.
`kapu` in Hawaiian marks what is bounded and what requires ceremony to cross.
Does not replace the act it qualifies — it marks the act's threshold.

### `pono` — constraint family edge sugar `[SC]`

```
<<~ pono #slot ? -> lar:///uri >>
<<~ pono ? -> lar:///uri role:must-hold >>
```

Keyword-arg form (`required:` / `target:`) is not yet implemented; use positional `FROM -> TO role:R` form.

Declares a structural rule or invariant that must hold — no execution pulse.
Wires as `family:constraint` pranala at compile time.
`pono` in Hawaiian: rightness, correctness, the proper state of a thing.

Distinguished from `kapu`: `kapu` marks a boundary *at the surface* (render-layer qualification, uncertainty posture);
`pono` declares a *structural rule* that must hold in the compiled graph (compile-layer assertion).

### `message` sugar (deferred)

`message` family has no dedicated sugar form yet. `lele` (structured branch/fire-and-continue) covers runtime
message dispatch; explicit `<<~ pranala family:message >>` covers structural graph edges.
`hau` (gift/reciprocal signal) remains a candidate if inline message-routing sugar proves necessary.

<<~/ahu >>

<<~ ahu #definition-sigils >>

## Definition Sigils — Pragma Mode `<<~!` `[SC]`

These sigils define reusable named content. They live in `<<~!` pragma mode.
The boot compiler **ignores** `<<~!` blocks — they are render-time definitions only.
No compile-time graph artifact is produced.

### `wehe` — named wikitext form (procedure/macro) `[SC]`

TW5 analogs: `\define`, `\procedure`

`wehe` = to open, unfold, spread apart. Opens a named wikitext form that `kahea` can summon.

```
<<~! wehe greeting(name "World") >>
Hello, <<~ kahea name >>!
<<~/wehe>>
```

Named wikitext snippet with optional parameters (name + optional default).
Parameters summoned via `<<~ kahea param-name >>` inside the body — not bare text substitution.
Body is memetic-wikitext; invoked via `<<~ kahea greeting(name:"Operator") >>`.

**Distinction from `helu`:** `wehe` unfolds wikitext; `helu` produces a URI/value list.

### `helu` — named filter-expression function `[SC]`

TW5 analog: `\function`

`helu` = to enumerate, count, list. Produces a list when `kahea` summons it.

```
<<~! helu taggedAs(tag) = [tag<tag>sort[title]] >>
```

Named filter expression fragment. Body is TW5 filter syntax (guest grammar `x-tiddlywiki-filter`).
Yields a URI list when summoned via `<<~ kahea taggedAs(tag:"invariant") >>`.

### `kahea` extended — summon URI content or named definition `[SC]`

`kahea` (live transclusion) extends naturally to cover definition invocation.
The dispatch rule: URI prefix (`lar:///`) → meme transclusion. Plain name → definition lookup.

```
<<~ kahea lar:///ha.ka.ba/@lares/mu >>         summon URI content (existing contract)
<<~ kahea greeting(name:"Operator") >>  summon a wehe definition
<<~ kahea taggedAs(tag:"invariant") >>  summon a helu function (yields list)
```

If the definition is not found: emits a stub and logs a warning.
Arguments use `key:"value"` notation. Positional args follow parameter order.

No standalone `call` sigil. `kahea` carries both invocation paths.

### Scope model (open question)

`wehe` / `helu` definitions in a carrier are **carrier-local** by default.
A definition in an invariant meme (depth 0) MAY be treated as boot-closure-global.
Explicit cross-carrier scoping: `<<~ aka lar:///define-carrier >>` imports the carrier's definitions
(observe edge at compile time + shadow embed at render time makes definitions available).
This is unresolved — see `#open-questions`.

<<~/ahu >>

<<~ ahu #english-aliases >>

## English Alias Namespace `[SC]`

The `\` prefix marks the **English alias namespace** inside the `<<~ ... >>` sigil surface.
English aliases carry identical semantics to their Hawaiian canonical forms.
The parser maps alias → canonical before evaluation — no semantic difference, no separate AST node.

This separation serves two purposes:
1. **Onboarding** — authors familiar with TW5 or English can write immediately without learning Hawaiian names.
2. **Clarity** — Hawaiian memetics vocabulary remains visually distinct from English-prefixed aliases in the same carrier.

### Alias table

| English alias | Canonical | Form | Basis |
|--------------|-----------|------|-------|
| `\procedure` | `wehe` | pragma block (`<<~!`) | TW5 `\procedure my-name(params)` syntax |
| `\function` | `helu` | pragma inline (`<<~!`) | TW5 `\function my-name(params) = expr` syntax |
| `\define` | `wehe` | pragma block (`<<~!`) | TW5 `\define` legacy form |
| `\tiddler` | `meme` | block | TW5 `<$tiddler>` |
| `\transclude` | `kahea` | inline | TW5 `{{Title}}` transclusion |
| `\link` | `loulou` | inline | HTML anchor / TW5 `[[link]]` |
| `\shadow` | `aka` | inline | TW5 shadow tiddler terminology |
| `\if` | `heihei` | block | universal conditional |
| `\else` | `mukuwai` | inline | universal fallback |
| `\elif` | `kahawai` | inline | universal branch |
| `\for` | `huli` | block | universal for-each iteration |
| `\sync` | `hui` | block | Verse `sync` keyword — 1:1 |
| `\race` | `holo` | block | Verse `race` keyword — 1:1 |
| `\rush` | `puka` | block | Verse `rush` keyword — 1:1 |
| `\branch` | `lele` | inline | Verse `branch` keyword — 1:1 |
| `\query` | `ui` | inline | filter result render surface |
| `\task`   | `hana` | block | bounded guest grammar / work block |
| `\guard` | `kapu` | inline | qualification / boundary posture *(provisional)* |

### Syntax

```text
# English alias forms (\ prefix)
<<~! \procedure greeting(name "World") >>
Hello, <<~ \transclude name >>!
<<~/\procedure>>

<<~! \function taggedAs(tag) = [tag<tag>sort[title]] >>

<<~ \tiddler lar:///uri >>
  Content with lar:///uri as context.
<<~/\tiddler>>

<<~ \transclude lar:///ha.ka.ba/@lares/mu >>

# Hawaiian canonical forms (same semantics)
<<~! wehe greeting(name "World") >>
Hello, <<~ kahea name >>!
<<~/wehe>>
```

### Parser contract

1. On encountering `\name` as a sigil command word, look up `alias_for` in the sigil registry.
2. Substitute the canonical sigil name. Continue parsing as if the canonical form was written.
3. The compiled AST carries the canonical name only — aliases are erased at parse time.
4. Diagnostics and error messages use the canonical name.
5. Authors may mix alias and canonical freely within a carrier.

### Open/close pairing

Alias block sigils use `\name` for both open and close:
```text
<<~! \procedure name >>
  body
<<~/\procedure>>
```
The close tag `<<~/\procedure>>` is valid. Parser maps it to `<<~/wehe>>` before matching.

<<~/ahu >>

<<~ ahu #context-conditional-sigils >>

## Context and Conditional Sigils — Render-Time `[SC]` / `[C]`

### `meme` — rendering context setter `[SC]`

TW5 analog: `<$tiddler tiddler="Title">`

`meme` = the well-defined named object. Sets which meme functions as "here" for the block body.
The name reinforces the system's own vocabulary: memetic-wikitext renders within meme context.

```
<<~ meme lar:///uri >>
  Content renders with lar:///uri as the current meme context.
<<~/meme>>
```

Sets the implicit rendering context for the block body. Inside `<<~/meme>>`, references to
"the current meme" resolve to `uri`. Enables templates that take any meme as input without
hard-coding the URI inside the template.

### `wai` — conditional rendering `[C]`

TW5 analogs: `<$list filter="..." limit="1">`, `<$reveal>`

`heihei` = race, competition (conditional test; first filter-match wins). `[C]` operator-ratified.
`mukuwai` = mouth of the water / fallback outflow. `[C]` operator-ratified.
`kahawai` = branch-channel / else-if. `[C]` operator-ratified.

```
<<~ heihei [tag[lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant]] >>
  Renders only when the current meme carries the invariant tag.
<<~/heihei >>

<<~ heihei [field:depth[0]] >>
  Renders when depth equals 0.
<<~ mukuwai >>
  Renders when depth is NOT 0.
<<~/heihei >>

<<~ heihei [tag[open-question]] >>
  Unresolved flow.
<<~ kahawai [tag[ready-for-canon]] >>
  Ready for council.
<<~ mukuwai >>
  Ordinary rest.
<<~/heihei >>
```

Filter expression evaluated against the current rendering context.
Non-empty result: render body. Empty: fall through to next `kahawai` or `mukuwai`.
Filter syntax: TW5 guest grammar (`x-tiddlywiki-filter`).

### `huli` — iterative rendering over filter results `[SC]`

TW5 analog: `<$list filter="...">`

Hawaiian dictionary senses of `huli` cover turning/reversing and looking for/searching/exploring/seeking/studying
(Pukui-Elbert). These senses support the project meaning: turn through a result set and seek each yielded item
systematically. `huli` receives approval as `[SC]` — iterative rendering, not general imperative looping.

```text
<<~ huli [tag[invariant]sort[title]] as item >>
  <<~ kahea item >>
<<~/huli>>
```

The command renders the body once for each URI the filter yields. The loop variable binds to `item` for
each body render. Empty results render nothing.

Implicit recursion guard: the same URI should not yield twice in one expansion chain. Duplicate suppression
preserves first-occurrence order.

Parser notes:

- `huli` carries block-only shape.
- The first argument functions as a filter expression or URI-producing selector.
- `as item` binds each yielded URI/title to `item`. The binding clause remains recommended; parsers MAY default to `item` if absent.
- Side effects remain disallowed unless a command definition explicitly permits them.
- Counters, mutation, accumulators, break/continue, and async traversal fall outside this approval.

Command declaration:

```yaml
command: huli
register: SC
shape: block-only
args:
  - filter_or_selector
  - as_binding: optional explicit binding clause, recommended form `as item`
body: render once per yielded result
binds:
  - item: yielded URI/title/result token
close: <<~/huli>>
side_effects: false
empty_result: render nothing
recursion_guard: per expansion chain; suppress duplicate URI yields
failure:
  invalid_filter: render nothing + diagnostic
  missing_binding: bind to `item` as default; emit diagnostic if grammar does not permit it
  mismatched_close: parse error with source preservation
```

<<~/ahu >>

<<~ ahu #guest-grammar-sigils >>

## Guest Grammar Sigils

### `hana` — bounded guest grammar block

```
<<~ hana x-tiddlywiki-filter >>
[tag[invariant]sort[title]]
<<~/hana >>
```

Admits a foreign grammar into a bounded worksite. `grammar-key` identifies the interpreter.
Guest grammar MUST NOT redefine host primitives. Malformed guest work degrades locally.

Currently registered grammar keys: `x-tiddlywiki-filter` (TiddlyWiki5 filter notation).

`wai`, `huli`, and `ui` accept filter expressions inline as guest grammar arguments — shorthand
for a `hana x-tiddlywiki-filter` block used as a gate or iteration driver.

### `ui` — query surface

```
<<~ ui [tag[invariant]sort[title]] >>
```

Evaluates filter expression and renders result as a navigable meme list.
Shorthand: `hana x-tiddlywiki-filter` → evaluate → render as `loulou` list.
Rendering mode (links, card tiles, frame clusters) determined by the active renderer.

<<~/ahu >>

<<~ ahu #recursion-guard >>

## Recursion Guard Model

### Render stack

Every renderer maintains a **render stack** per chain. When `aka` or `kahea` is evaluated:

1. URI already on render stack → **recursion detected**
2. `len(render_stack) >= 8` (default limit) → **depth exceeded**
3. Either condition: emit recursion-break stub: `[⬡ ∞ lar:///uri]`
4. Otherwise: push URI, render, pop.

### Compile-time DAG ≠ render-time recursion

- **Compile-time:** `MemeGraph.detectCycles` guards the control DAG. Prevents circular boot closure.
- **Render-time:** render stack guard prevents infinite transclusion loops.
These are orthogonal. A cycle-free DAG can still have mutual `kahea` transclusion chains.
Both guards must be present.

### Graceful degradation contract

Recursion-break stubs MUST be:
- **Visible** (not silently empty)
- **Non-crashing** (renderer continues)
- **Traceable** (stub identifies the URI that triggered recursion)

<<~/ahu >>

<<~ ahu #message-routing-protocol >>

## Message Routing Protocol `[SC]`

Research confirms that the message-up / render-down tree pattern is **correct modern architecture**,
not TW5 legacy. SwiftUI (PreferenceKey) and Flutter (NotificationListener + InheritedWidget)
independently converged on the same model. The key improvement over TW5: **decouple message
channels from tree position** — multiple independent channels, not a single `messagecatcher` per branch.

### Two routing directions

```
RENDER-DOWN  (environment / data-push)
  pranala family:dataflow — push-forward from source toward owned subtree
  Analog: SwiftUI Environment, Flutter InheritedWidget, React Context

MESSAGE-UP   (event / signal-bubble)
  pranala family:message — bubble from source toward control root
  Analog: SwiftUI PreferenceKey, Flutter Notification, DOM bubbling
```

### Invariant routing rules

1. A `family:dataflow` edge carries a value **root-ward → leaf-ward** (source pushes to owned subtree).
2. A `family:message` edge carries a signal **leaf-ward → root-ward** (source bubbles toward control root).
3. Routing follows the `family:control role:owns` DAG, not ahu nesting depth.
4. **Multiple independent channels** — one per named pranala edge. No global catcher.
   A meme declares itself a handler by having an inbound `family:message` pranala edge pointing to it.
5. Message propagation stops at the nearest upstream handler. If no handler exists, signal is dropped
   with a diagnostic (not an error).

### Lexical scope — no ambient `currentMeme`

Variables do not leak through sibling scope. `meme` sets an explicit lexical context:

```text
<<~ meme lar:///uri >>       binds lar:///uri as the rendering context — lexical, not ambient
  <<~ kahea sub-template >>  template sees lar:///uri as current meme
<<~/meme>>
                             sibling sigils outside this block are unaffected
```

This follows the Svelte `setContext` model: explicit, bounded, non-leaking.
`+currentMeme` ambient lookup from the TW5 filter grammar is **deprecated** in `wikitext-filter`.
Explicit binding via `meme` sigil replaces it.

### Filter context binding

Filters inside `wai`/`huli`/`ui` evaluate against the **explicit current meme context**
(set by the nearest enclosing `meme` block, or the carrier's own `#iam` URI if no `meme` is active).
No ambient dynamic lookup.

<<~/ahu >>

<<~ ahu #concurrency-sigils >>

## Concurrency Sigils `[SC]`

These sigils cover Verse's concurrency model (`sync`/`race`/`rush`/`branch`) and the message/dataflow
boundary for parallel execution. All four carry `[SC]` approval.

Hawaiian semantic grounding (Pukui-Elbert):
- `hui` — to gather, assemble, unite; a group coming together
- `heihei` — to race, compete; contention between parallel flows
- `puka` — to emerge, break through, come out; the first to surface
- `lele` — to leap, fly, jump off; departure without waiting for return

| Sigil | Shape | Verse analog | Meaning | Register |
|-------|-------|-------------|---------|----------|
| `hui` | block-only | `sync` | wait for all parallel flows to complete | `[SC]` |
| `heihei` | block-only | `race` | first-to-finish wins; others continue | `[SC]` |
| `puka` | block-only | `rush` | first-to-finish wins; rest cancelled | `[SC]` |
| `lele` | inline | `branch` | fire and forget; no return value | `[SC]` |

### `hui` — wait for all `[SC]`

TW5 analog: none. Verse: `sync { expr1, expr2 }`.

```text
<<~ hui >>
  <<~ kahea lar:///source-a >>
  <<~ kahea lar:///source-b >>
<<~/hui>>
```

Renders all child sigils in parallel. Waits for all to complete before proceeding.
Result: all outputs composed in declaration order.

### `heihei` — first wins, rest continue `[SC]`

TW5 analog: none. Verse: `race { expr1, expr2 }`.

```text
<<~ heihei >>
  <<~ kahea lar:///source-a >>
  <<~ kahea lar:///source-b >>
<<~/heihei>>
```

Evaluates all branches in parallel. Returns the first result to complete.
Other branches continue to completion but their results are not rendered.
Use when any valid result suffices and speed matters.

### `puka` — first wins, rest cancelled `[SC]`

TW5 analog: none. Verse: `rush { expr1, expr2 }`.

```text
<<~ puka >>
  <<~ kahea lar:///source-a >>
  <<~ kahea lar:///source-b >>
<<~/puka>>
```

Evaluates all branches in parallel. Returns the first result to complete.
Cancels all remaining branches immediately.
Use when only one result is needed and redundant work should not continue.

### `lele` — fire and forget `[SC]`

TW5 analog: `<$action-sendmessage>`. Verse: `branch { expr }`.

```text
<<~ lele lar:///uri >>
<<~ lele greeting(name:"Operator") >>
```

Inline only. Dispatches the target without waiting for completion.
No return value. Side effects permitted (explicitly declared kind).
Maps to `pranala family:message` at compile time — the graph records the dispatch edge
but the renderer does not block on the result.

### Relation to pranala families

```text
hui    → compile: no edge; render: aggregates dataflow results
heihei → compile: no edge; render: races dataflow, first wins
puka   → compile: no edge; render: races dataflow, cancels losers
lele   → compile: pranala family:message; render: async dispatch
```

`lele` is the only concurrency sigil that produces a compile-time graph artifact.
The other three are pure render-time coordination forms.

### Recursion guard applies

The render stack guard applies to `hui`/`heihei`/`puka` bodies.
`lele` is fire-and-forget — it does not push to the render stack.

<<~/ahu >>

<<~ ahu #tw5-parity-map >>

## TW5 → Lararium Parity Map

| TW5 construct | Syntax | Lararium analog | Status |
|---|---|---|---|
| Tiddler identity | title field | `ahu #iam` TOML + `lar:` URI | ✓ current |
| Tag | `tags: [[X]]` | `pranala family:control role:implements` | ✓ current |
| Link | `[[Title]]` | `<<~ loulou lar:///uri >>` | ✓ current |
| Shadow tiddler reference | (implicit) | `<<~ aka lar:///uri >>` (observe family) | ✓ current |
| Inline transclusion | `{{Title}}` | `<<~ kahea lar:///uri >>` (dataflow family) | ✓ current |
| Template transclusion | `{{Title\|\|Template}}` | `<<~ meme lar:///uri >>` + `<<~ kahea lar:///template >>` | ◎ proposed `[SC]` |
| Section transclusion | `{{Title##section}}` | `<<~ kahea lar:///uri#section-id >>` | ◎ proposed (fragment form) |
| Macro/procedure definition | `\define name(p) body` | `<<~! wehe name(p) >>` or `<<~! \procedure name(p) >>` | ◎ `[SC]` — alias registered |
| Function definition | `\function name(p) = expr` | `<<~! helu name(p) = expr >>` or `<<~! \function name(p) = expr >>` | ◎ `[SC]` — alias registered |
| Macro/procedure call | `<<macroName params>>` | `<<~ kahea name(key:val) >>` or `<<~ \transclude name >>` | ✓ parse layer — `SigilNode { sigilName:"kahea", attrs:{name,args} }`; wehe executor pending |
| Context-set | `<$tiddler tiddler="X">` | `<<~ meme lar:///X >>` or `<<~ \tiddler lar:///X >>` | ◎ `[SC]` — alias registered |
| Conditional | `<$list filter="..." limit="1">` | `<<~ heihei filter >> ... <<~ mukuwai >> ... <<~/heihei >>` | ◎ `[C]` names |
| Iteration | `<$list filter="...">` | `<<~ huli filter as item >> ... <<~/huli>>` | ◎ proposed `[SC]` approved |
| Variable set | `<$set name="v" value="x">` | `<<~! wehe v = "x" >>` (no-param wehe) | ◎ proposed |
| Filter notation | `[tag[X]sort[title]]` | `<<~ hana x-tiddlywiki-filter >> ... <<~/hana >>` | ✓ current |
| Filter in widgets | inline `filter="..."` | inline filter arg in `heihei`/`huli`/`ui` | ◎ proposed |
| Recursion guard | depth 8 | render stack `len >= 8` → stub | ◎ proposed |
| Import | `\import [[FilterExpr]]` | `<<~ aka lar:///carrier >>` (shadow include) | ✓ current |
| Widget definition | `\widget $name` | deferred — no widget layer yet | ⚠ deferred |
| HTML widgets | `<$widget ...>` | deferred — renderer-specific | ⚠ deferred |
| Message family | (via `sendMessage`) | `<<~ lele lar:///uri >>` (fire-and-forget sugar) | ◎ `[SC]` — `lele` registered |
| Constraint family | (via rules) | `<<~ pono #slot ? -> lar:///uri >>` | ◎ `[SC]` — `pono` registered |

**Verse/UEFN parity (additions):**

| Verse construct | Lararium analog | Status |
|-----------------|----------------|--------|
| `sync { a, b }` | `<<~ hui >> ... <<~/hui>>` | ◎ `[SC]` |
| `race { a, b }` | `<<~ holo >> ... <<~/holo>>` | ◎ `[SC]` |
| `rush { a, b }` | `<<~ puka >> ... <<~/puka>>` | ◎ `[SC]` |
| `branch { expr }` | `<<~ lele lar:///uri >>` | ◎ `[SC]` |
| `if` (failure-typed) | `<<~ heihei filter >>` (non-empty = success) | ◎ `[C]` — note: Verse `if` semantics differ |
| `for` loop | `<<~ huli filter as item >>` | ◎ `[SC]` |
| `\procedure` | `<<~! wehe name(p) >>` or `<<~! \procedure name(p) >>` | ◎ `[SC]` |
| `\function` (pure) | `<<~! helu name(p) = expr >>` | ◎ `[SC]` |
| Entity (ECS) | `ahu` block with `#iam` TOML | ✓ current |
| Component (ECS) | `pranala family:control role:implements` | ✓ current |
| Prefab/template | `lifecycle:template` pranala edge | ✓ designed |
| Event binding | `pranala family:message` / `lele` | ◎ `[SC]` |

Legend: ✓ = current, ◎ = proposed/registered, ⚠ = deferred or pending

<<~/ahu >>

<<~ ahu #law-of-5s >>

## The Law of Fives — Invariant Alignment Table

All phenomena relate to five. Not mysticism — a statement about how the mind partitions continuous scales. The same 5-point skeleton recurs across every domain in the system.

Two orthogonal axes. **Scale** (how big a loop). **Phase** (where in the loop). They run counter to each other: Act sits at the finest-grain scale; Observe spans the widest. That tension produces traction — to act you narrow, to observe you widen.

### The Two Axes

```
LADDER_5  (scale, finest → coarsest):  action → round → turn → watch → week
OODA_HA_5 (phase, active → reflective): act   → decide → orient → observe → aftermath
```

Exported from `packages/lararium-mesh/src/ast.ts` as `LADDER_5`, `OODA_HA_5`, `SCOPE_5`.

### Alignment Table

| axis | 1 — finest/active | 2 | 3 | 4 | 5 — coarsest/reflective |
|------|------------------|---|---|---|------------------------|
| **Chrono scale** | action | round | turn | watch | week |
| **Scope** | ephemeral | personal | consensual | collective | universal |
| **OODA-HA phase** ▶◇⏿✶⤴↺ | act | decide | orient | observe | aftermath |
| **Discordian season** | Bureaucracy | Confusion | Discord | Chaos | Aftermath |
| **Zoom level** | glyph | token | meme | room | network |
| **Kowloon addressing** | (turn-local) | @domain | circle | group | @public |
| **Type state** | typed/committed | interpret | named shapes | `?` string | — |
| **Tool phase affinity** | Sword `!` | — | Cup `?` / Wand `*` | Wand `*` | Pentacle `~` |
| **Stance phase affinity** | Satirist 🗡️ | Philosopher 🏛️ / Humorist 🎭 | Poet 🌊 / Humorist 🎭 | Poet 🌊 | Private 🔮 |

Scale and phase run as **independent axes** — a Turn-scale loop can sit in any OODA-HA phase. The Chronometer fragment `#O0.O3.D2.A7` encodes both in display; the semantic model carries them separately: `{ scale: Ladder5, phase: OodaHa5, counter: number }`.

Tool and Stance phase affinities show the natural convergence points — not locks. A Philosopher can run in any phase; Decide is simply where propositional register earns its keep. Arcana `-` has no phase affinity — it releases the loop rather than occupying a position in it.

### Scale ↔ Scope ↔ Kowloon

`kau scope:ephemeral` = `scale: "action"`. `kau scope:universal` = `scale: "week"`. The scope ladder IS the Ladder5 projected onto state ownership. `SCOPE_TO_LADDER` in `ast.ts` makes this explicit.

<<~/ahu >>

<<~ ahu #scope-phase-resolution >>

## TW5 ↔ Verse Type Tension — Resolution

The tension between TW5's string-typed store (`Record<string,string>`) and Verse's strong types resolves through the OODA-HA loop. They were never in conflict — they occupy different phases.

### The Pipeline as Loop Phases

| phase | system role | type state | scale |
|-------|-------------|-----------|-------|
| ✶ Observe | carrier text arrives as raw string | `Record<string,string>` — `?` | Week |
| ⏿ Orient | `parseMemeCarrier` → `MemeAstNode[]` | named shapes, attrs unresolved strings | Watch |
| ◇ Decide | `edgesFromAst` interprets sigil attrs | `string` → `Ladder5 \| OodaHa5 \| PranalaEdge…` | Turn |
| ▶ Act | Verse execute / render / canvas | typed, transactional, committed | Round |
| ⤴↺ Aftermath | `validatePranalaEdge`, blame calculus | contract violations surface, loop closes | Action |

**`attrs: Record<string,string>`** — the honest Observe-phase representation. Siek's `?` type at parse boundary, correct for the phase. King's "parse, don't validate" fires at Decide: consume the string bag once, emit typed values, carry them forward. Act phase can then run as strict as Verse demands.

**Blame calculus (Wadler & Findler):** when a `scope:ephemeral` value escapes its Action-scale container, blame falls on the boundary that failed to enforce the scope type — Aftermath surfaces it via `validatePranalaEdge`.

**Elm's no-nested-signals rule:** scope can only widen (`ephemeral → personal` valid), never silently leak (`universal → ephemeral` a contract violation). Enforced at the Decide→Act boundary.

**`papalohe` and `kukali` (Gap 5):** `papalohe` declares the reaction wire at Orient phase — a named shape in the graph. Verse `suspends`/`kukali` operates at Act phase — execution suspended until the loop advances. The wire and the wait posture belong to different phases; they name different things. See `#gaps-tensions-conflicts` Gap 5.

<<~/ahu >>

<<~ ahu #stances-syad-tools >>

## Stances, Syad, and Tools — Three Separate Graphs

Three distinct graphs whose edges intersect but do not collapse. Conflating them produces overloaded tables; separating them reveals structural properties each graph alone cannot show.

**Graph 1 — Stances → Syad predicate (epistemic register):**

An operator holds a stance. The stance sets what the register measures — not a phase, not a tool. Phase affinity marks where that register earns its keep most naturally; any stance can operate in any phase.

| stance | Syad predicate | P# | register measures | phase affinity |
|--------|---------------|-----|-------------------|----------------|
| 🏛️ Philosopher | asti | P1 | propositional support | Decide |
| 🌊 Poet | avaktavya | P3 | analogical resonance (outward) | Observe/Orient |
| 🗡️ Satirist | nāsti → nāsti+avaktavya | P2→P6 | targeting confidence | Act |
| 🎭 Humorist | asti-nāsti | P4 | relational fit | Orient/Decide |
| 🔮 Private | avaktavya | P3 | inward presence (inward) | Aftermath |

Poet and Private share P3. The Syad graph alone cannot distinguish them — only the Tool graph (feed direction) separates the two avaktavya registers.

The Satirist carries a gradient: stated predicate P2 (nāsti), operational predicate P6 (nāsti+avaktavya). A Satirist stable only at P2 names absence but unsteadies when the void opens. A Satirist who can hold P6 uses the void as the targeting instrument. This gradient marks maturity within a single stance.

**Graph 2 — Syad 7 predicates:**

Three primitives — T (asti/affirms), F (nāsti/denies), M (avaktavya/withholds) — yield 7 compounds. `avaktavya` does not signal "insufficient data"; it signals that the T/F axis does not fit the claim from this standpoint.

| P# | compound | covered by |
|----|----------|------------|
| 1 | T | Philosopher |
| 2 | F | Satirist (stated) |
| 3 | M | Poet / Private (same predicate, opposite directions) |
| 4 | T+F | Humorist |
| 5 | T+M | threshold — Philosopher past its boundary |
| 6 | F+M | threshold — Satirist operational; also Satirist past its boundary |
| 7 | T+F+M | Arcana `-` only |

P5 and P6 name threshold crossings, not stable standpoints. P5 surfaces when a Philosopher commits to a true claim and the claim points past what propositional form can carry — the proof holds, the object bleeds through it. P6 surfaces when a Satirist lands a clean targeting and the absence opens onto something that resists description — the void underneath will not close. Both signal the moment to consider reaching for Arcana.

Arcana maps directly to P7. No stance mediates it — an operator reaches for it, does not inhabit it.

**Graph 3 — Tools → feed × aperture:**

Tools encode two orthogonal axes: feed direction (external/internal/release) and aperture (wide/narrow/release). This graph carries no Syad information — it encodes how an operator orients, not what they claim.

| tool | ascii | feed | aperture | phase affinity |
|------|-------|------|----------|----------------|
| Wand | `*` | external | wide | Observe |
| Cup | `?` | external | wide | Orient |
| Sword | `!` | external | narrow | Decide/Act |
| Pentacle | `~` | internal | narrow | Aftermath |
| Arcana | `-` | release | release | — |

Wand and Cup share feed=external/aperture=wide — they differ in phase affinity and relational character. Any operator may hold any tool within any stance. A Poet wielding `!` cuts precisely at resonance — strange and productive.

**Conflict pairs — Tool graph only:**

Conflict pairs encode Tool-axis tensions, not Syad tensions.

- `*~` **Signal Jam** — Wand+Pentacle — external feed locked against internal feed. Poet↔Private tension when not resolved. The Satirist's natural posture IS `*~`; they hold it productively as targeting instrument. Signal Jam as pressure state applies to all other stances.
- `?!` **Dubious Move** — Cup+Sword — wide aperture locked against narrow. Humorist↔Philosopher tension. No stance naturalizes this; it surfaces when relational fit asserts propositional precision it cannot support.

The Satirist naturalizes one conflict pair and no other stance does. This marks the Satirist as the hinge of the Tool graph — they operate from what would jam everyone else.

**Postures** — canonical Tool combinations:
- `*!` — external/narrow — track external, zoom in for detail
- `*?` — external/wide — track external, zoom out for relation
- `~!` — internal/narrow — ground internal, precision
- `~?` — internal/wide — ground internal, overview
- `--` — Arcana — release current reading, model agnosticism

**Structural observations from separation:**

1. The system gravitates toward M. Three of five stances live in or near avaktavya (Poet P3, Private P3, Satirist P6). Only Philosopher and Humorist operate entirely in the T/F plane.
2. Poet and Private require the Tool graph to differentiate — Syad alone cannot separate them.
3. Arcana exists only in the Tool graph and Syad graph; it has no Stance. It cannot be inhabited, only reached for.
4. Conflict pairs encode Tool-axis tensions exclusively; they carry no Syad structure.

<<~/ahu >>

<<~ ahu #gaps-tensions-conflicts >>

## Gaps, Tensions, and Conflicts

### Gap 1: `message` and `constraint` families — sugar sigils

**Status:** Both families registered in grammar meme `[[families]]` array (resolved M7).
Message routing protocol documented in `#message-routing-protocol`.

`family:constraint` → `pono` registered as `[SC]` edge-sugar (compile layer). Distinction from `kapu`:
- `kapu` = boundary **posture** at render surface (qualification, confidence, unresolved threshold)
- `pono` = structural **rule assertion** in compiled graph (must-hold invariant, no execution pulse)

`family:message` → `lele` covers fire-and-forget runtime dispatch; explicit pranala covers structural edges.
`hau` deferred — no current pressure requiring dedicated inline message-routing sugar.

### Gap 2: ~~`hana`, `kapu`, `ui` not registered~~ — Resolved

All three registered in grammar meme (2026-04-27). Also added: `meme`, `wai`, `mukuwai`,
`kahawai`, `huli`, `wehe`, `helu`, plus 5 English aliases, plus 4 concurrency sigils.
Grammar meme now carries 40 `[[sigils]]` entries.

### Gap 3: No `layer` field in sigil registry

**Problem:** Grammar meme does not distinguish compile-time from render-time sigils.
A naïve parser might try to extract `wehe`/`huli`/`wai` as graph edges at boot time.

**Resolution:** Add `layer = "compile"` | `layer = "render"` | `layer = "both"` to each
`[[sigils]]` entry. Edge sigils (`aka`, `kahea`, etc.) get `layer = "both"`.
Definition/conditional sigils get `layer = "render"`. `ahu`, `iam`, `? ->` get `layer = "compile"`.

### Gap 4: Pragma `<<~!` dispatch mode undefined in parser

The current parser does not handle `<<~!`. Pragma blocks (`wehe`/`helu`) are invisible.

**Resolution:** Boot compiler IGNORES `<<~!` blocks — they produce no compile-time artifacts.
No parser change needed at the compile layer. Render-time interpreters handle them.
This is correct by the dual-layer model: pragma blocks are render-only.

### Tension 1: `aka` drift — "passive inclusion" vs. "shadow transclusion"

**Problem:** The docs primitive guide warns "avoid treating `aka` as implying live invocation."
This warning is correct but incomplete. `aka` IS shadow transclusion — it is not purely passive.
It carries observe-family pressure with render-time embedding semantics.

**Resolution:** The warning should be: do not treat `aka` as LIVE transclusion. `aka` = shadow
(read-only, non-propagating). `kahea` = live (propagating). The distinction is propagation direction
and fidelity, not presence/absence of transclusion.

### Tension 2: Compile-time cycle detection vs. render-time recursion guard

Both must exist. The compile-time DAG guard (control cycles) does not prevent render-time
recursion via `aka`/`kahea`. A cycle-free graph can contain mutual live transclusion.

### Tension 3: `<<~!` pragma scope — carrier-local vs. global

`wehe` and `helu` in a carrier are local by default. Invariant meme definitions may need
global visibility. Mechanism: `<<~ aka lar:///carrier >>` imports the carrier's definitions
(shadow transclusion brings in the definition namespace). This is unresolved in the boot model —
does the compiler parse `wehe`/`helu` blocks inside `aka`-referenced carriers to build a definition index?

### ~~Tension 4: `kahea` dual dispatch — URI vs. definition name~~ — Resolved

`kahea` carries two dispatch paths, disambiguated at parse time:

- **URI form** (`lar:///...`, path with `/`, fragment with `#`) → `EdgeSugarNode { sigil:"kahea", family:"dataflow" }` — compile-time dataflow edge + render-time live transclusion
- **Name form** (plain identifier, optionally `name(args)`) → `SigilNode { sigilName:"kahea", attrs:{ name, args } }` — render-only, no graph edge

The parser matches URI form first (regex anchored on `lar:` prefix or presence of `/`/`#`). Name form catches all remaining plain identifiers. A `wehe` parameter interpolation (`<<~ kahea paramName >>` inside a body) also resolves as name form — the parameter IS a locally-scoped definition.

**Invariant:** the compile layer never sees a malformed dataflow edge for a plain name target. `parsePranalaEdges` on a carrier containing `<<~ kahea greeting >>` produces zero dataflow edges.

### Tension 5: TW5 filter inline vs. `hana` block syntax

`wai`/`huli`/`ui` accept filter expressions inline. `hana` requires a block.
Both forms must parse to the same semantics. Authors who need complex multi-line filters
use `hana`. Simple one-liner filters use the inline sigil form.

### Conflict 1: Bare `<<name>>` form

TW5 macro calls use `<<macroName>>`. This is not valid Lararium syntax.
Authors migrating TW5 content MUST convert `<<macro>>` → `<<~ kahea macro >>`.
There is no TW5-compat bare-bracket pass planned.

### Gap 5: Verse `suspends` / `kukali` — reactive wait posture inside a causal island

**Status:** Design model sharpened (2026-04-28). `kukali` candidate sigil. Blocked on async `ReactionGraph`.

In Verse, `suspends` marks an expression that yields its causal island until an event fires. This is the *wait posture inside an island* — distinct from `papalohe` (which declares the inter-island wire) and `hui`/`heihei`/`puka` (which coordinate parallel islands). `papalohe` is the graph edge; `kukali` is the execution posture.

**Causal island model (UEFN):** each `kumu` instance is an isolated async boundary. Events cross boundaries only via declared `papalohe` edges. Within an island, `kukali` yields execution until the subscribed event fires on the island's input port. This is isomorphic to `await` on a `Promise` — not a coroutine, not a callback, an async yield.

**Async-first implication:** `ReactionGraph.fire()` must return `Promise<void>` before `kukali` can have semantics. The wait posture has no meaning without an async execution context. This is the correct dependency order — not a design gap, a sequencing requirement.

Candidate surface form: `<<~ kukali trigger:OnBegin >>` (inline wait) or block `<<~ kukali trigger:OnBegin >>...<<~/kukali>>` (wait + body executes on resume). Register after `ReactionGraph.fire()` is async.

### Gap 6: UEFN `prop` (static world geometry) vs. `kumu` (device type)

**Status:** Unregistered. Low priority.

UEFN has two named entity types: `creative_device` (interactive, event-capable) and `prop` (static geometry, no events). `kumu` covers `creative_device`. A `prop` is a typed world object with no reactive surface. Could be `kumu kind=prop` via a convention in the `params` attr, or a dedicated sugar sigil. Defer until UEFN projection milestone.

### Gap 7: Verse module access modifiers

**Status:** Convention proposed, not registered as sigil.

Verse has `public`, `internal`, and `private` visibility modifiers. These map naturally to `<<~ kapu qualifier:public >>`, `<<~ kapu qualifier:internal >>`, `<<~ kapu qualifier:private >>` — but this convention is undocumented and untested. Register as a `kapu` attrs convention note, not a new sigil.

### Gap 8: parseTree → widgetTree → renderTree — the missing middle layer

**Status:** Design resolved (2026-04-28). Implementation pending Phase 3.

TW5 executes via three trees: parse tree (WikiParser) → widget tree (Widget subclass instances) → DOM. The widget tree is the execution-bearing layer — each node knows its renderer.

Lararium has parse tree (`MemeAstNode[]`) and render tree (tldraw shapes). The widget tree is missing.

**`kumu` is the widget-tree node type definition.** `<<~! kumu name(params) >>...<<~/kumu >>` defines a new widget type — equivalent to TW5 `\widget $name`. A `<<~ kahea name(args) >>` name-form call (now correctly a `SigilNode`) resolves at widget-tree build time against the `KumuRegistry` into a `WidgetNode { type: KumuDef, props: {...} }`. The render pass walks `WidgetNode[]`, not raw `MemeAstNode[]`.

**UEFN equivalence:** a `kumu` type IS a UEFN `creative_device` type — same primitive. It has `@editable` props (`kau` bindings), event ports (`papalohe` edges), and runs as a causal island (async boundary).

**Three-tree pipeline (target):**

```
carrier text
  → MemeAstNode[]           parseMemeCarrier()         Phase 2 (complete)
  → WidgetNode[]             resolveWidgetTree()         Phase 3 (pending)
  → tldraw shapes / output   render pass                Phase 3 (pending)
```

`resolveWidgetTree(ast, registry)` is the Phase 3 entry-point function. Registry populated from boot artifact's `kumu` sigil nodes.

### Conflict 2: TW5 `{{Title||Template}}` mapping

Simple transclusion `{{Title}}` maps cleanly to `<<~ kahea lar:///uri >>`.
Template transclusion `{{Title||Template}}` has no direct sigil form — requires:
1. `<<~ meme lar:///uri >>` to bind the target meme as context
2. `<<~ kahea lar:///template >>` to render the template with that context

This is a two-sigil composition, not a single sigil. Authors should prefer explicit `meme`+`kahea`
over a hypothetical `<<~ kahea lar:///uri via lar:///template >>` form.
The single-form version is not ruled out but adds parser complexity without clear gain.

<<~/ahu >>

<<~ ahu #sigil-registry-status >>

## Sigil Registry Status

All sigils documented in this spec are registered in `lares/pono/memetic-wikitext.md`.
All eight families are wired in `pranala-parser.ts` (`KNOWN_FAMILIES`, `FAMILY_CONTRACTS`).

**Sigils added in Grammar Phase 2.x (post-M7):**

| Sigil | Kind | Family | Note |
|-------|------|--------|------|
| `kau` | pragma | — | variable binding; carrier-scoped (`<<~!`) or block-scoped (`<<~`) |
| `kumu` | pragma | — | element type definition; self-hosting grammar node |
| `papalohe` | edge-sugar | reaction | pāpālohe — body-listening reflex; UEFN device graph event wire |
| `pono` | edge-sugar | constraint | inline-pranala-style constraint; no exec pulse |
| `lele` | edge-sugar / concurrency | message | fire-and-forget dispatch; compile: pranala family:message |
| `kapu` (block) | edge-sugar | — | block form `<<~ kapu Q >>...<<~/kapu >>` added alongside inline |

**English aliases added in Phase 2.x:**

`\const`, `\let`, `\var` → `kau` | `\widget`, `\type`, `\typos` → `kumu` | `\import` → `kahea` | `\constraint` → `pono`

<<~/ahu >>

<<~ ahu #open-questions >>

## Open Questions

1. **`wehe`/`helu` scope model.** Carrier-local vs. boot-closure-global for invariant meme definitions.
   Does `<<~ aka lar:///carrier >>` import that carrier's definitions into the current namespace?

2. **Sugar sigil for `spatial` family.** Family registered; sugar sigil pending. No English alias yet. Candidate: a directional portal sigil. Roles: `contains`, `portal`, `adjacent`, `layer`.

3. **`<<~?` unresolved-pressure mode syntax.** Block form?
   `<<~? #fragment >> ... <<~/? >>` — marks a worksite as explicitly unresolved.
   Currently the `?` token appears only in `? ->` edge notation and as a `kapu` qualifier.
   Should `<<~?` be a first-class open/close block sigil?

4. **Template cascade.** TW5's `$:/tags/ViewTemplate` cascade — walk a priority-ordered template
   list and pick first match — maps to `lares/templates/` for tldraw projection.
   Does the same cascade apply to `focus`+`kahea` text rendering? Or is template selection always
   explicit (`<<~ focus uri >> <<~ kahea template >>`) rather than implicit cascade?

5. **`call` parameter naming inside `define` body.** TW5 text substitution is fragile (positional
   parameter names appear verbatim). Lararium `call param-name` inside a define body should be
   an explicit sigil call, not bare text substitution. Formal grammar rule needed.

6. **`lele` vs Verse `branch` semantic alignment.** `lele` is fire-and-forget (unconditional send). Verse `branch` is a cancellable speculative fiber — closer to `spawn`. The `\branch` alias maps to `lele`, which is correct for fire-and-forget dispatch but does NOT cover Verse branch's speculative/cancellation semantics. A future `\spawn` or `\fiber` alias may be needed for the speculative case.

7. **Async ReactionGraph.** `ReactionGraph.fire()` must return `Promise<void>` before `hui`/`heihei`/`puka`/`kukali` have execution semantics. The graph structure is correct; the execution model is synchronous today. This is the single unlock for Verse concurrency parity.

8. **Widget tree resolution pass.** `resolveWidgetTree(ast: MemeAstNode[], registry: KumuRegistry): WidgetNode[]` is the Phase 3 entry function. `KumuRegistry` maps `kumu` name → `KumuDef`. `SigilNode { sigilName:"kahea" }` name-form nodes are re-typed at this pass. Render pass reads `WidgetNode[]`. See `#gaps-tensions-conflicts` Gap 8.

9. **kumu causal island boundary.** Does each `kumu` instance get its own async execution context, or does the shared `ReactionGraph` manage all island dispatch? UEFN model: each device is isolated; the device graph (our reaction edges) is the only crossing point. Implementation: one `Promise` chain per `kumu` instance, dispatched via `ReactionGraph`. Not one global event loop.

10. **Naming ratification status.** As of 2026-04-28:
   - `[C]`: `wai`, `mukuwai`, `kahawai` — operator-ratified.
   - `[SC]`: `huli`, `wehe`, `helu`, `meme`, `kahea` (extended), `aka`, `ahu`, `loulou`, `hana`, `ui`, `kapu`, `pono`, `hui`, `heihei`, `puka`, `lele`.
   - No standalone `call` sigil — `kahea` extended contract covers URI transclusion + definition invocation.
   - Context sigil: `meme` (not `wahi`); the well-defined named object; reinforces system vocabulary.
   - Heritage community consultation recommended before any `[SC]` names advance to `[C]`.

<<~/ahu >>


<<~ ahu #edges >>

## Edges

<<~ pranala #defines-grammar ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext family:control role:extends >>
<<~ pranala #pranala-law ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/pranala family:control role:governed-by >>
<<~ pranala #mwt-law ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext family:control role:governed-by >>
<<~ pranala #tw5-filter ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/x-tiddlywiki-filter family:observe role:references >>
<<~ pranala #to-foundations ? -> lar:///lararium-node/MEME-STORE-FOUNDATIONS family:observe role:informs >>
<<~ pranala #to-roadmap ? -> lar:///lararium-node/ROADMAP family:observe role:informs >>
<<~ pranala #tiddler ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-toml family:control role:implements >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/pono/memetic-wikitext >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/guest-grammar >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
