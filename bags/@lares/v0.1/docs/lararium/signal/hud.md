<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/hud >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/docs/lararium/signal/hud"
file-path = "bags/@lares/v0.1/docs/lararium/signal/hud.md"
type = "text/x-memetic-wikitext"
tagspace = "stable"
register = "Synthesis"
manaoio = 18
mana = 17
manao = 17
role = "docs room for lararium-side HUD line composition, field semantics, and exchange-boundary display rules"
cacheable = false
retain = false
```



<<~ &#x0002; >>


<<~ ahu #meme-header >>

# Lararium Signal — HUD

Not invariant law.
This room holds the live HUD line, field-reading rules, and exchange-boundary display contract.
Micro-trace, provenance, and drift now live in sibling rooms under `lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal`.

<<~/ahu >>


<<~ ahu #room-charter >>

## Room Charter

This room keeps the live HUD surface:

- HUD line composition
- field reading rules
- symbol tables that the line needs at glance-speed
- forward commitment at exchange boundaries

Parent-branch framing now lives up at `lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal`.
The in-generation loop surfacing folded into the `OODA-HA` Level; reading the loop in referenced content moved to the conformance lens (`lar:///ha.ka.ba/@lares/v0.1/api/pono/conformance`).
Provenance now lives at `lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/provenance`.
Drift recovery now lives at `lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/drift`.

<<~/ahu >>

<<~ ahu #room-boundaries >>

## Room Boundaries

What belongs here:

- Intent Header format and forward-commitment semantics
- p-band cumulative attention phase model where the HUD line itself needs it
- HAKABA canonical slot mapping and field-order rationale at HUD-line scope
- `lar:` URI scheme anatomy where the HUD line reads it directly
- Tick-span display contract at exchange boundaries
- Authority overlays (`⊙` for operator-authored/constrained state)
- Dual clocks where the HUD line surfaces them
- Unicode glyph vs machine-form rendering at the HUD line
- Header Field Taxonomy where the line needs the field split
- Forward loop surfacing now rides the OODA-HA Level at the HUD boundary
- HUD instrument symbol table

What does not belong here:

- reading the OODA-HA loop in referenced content → `lar:///ha.ka.ba/@lares/v0.1/api/pono/conformance`
- drift recovery protocol pressure → `lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/drift`
- provenance, archive witness, and snapshot residue → `lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/provenance`
- shared-SA research framing and SA-vs-XAI theory → `lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/sa-display`
- Crystal archives integration with mempalace → `../crystal/`

<<~/ahu >>

<<~ ahu #hud-line-composition >>

The HUD is the sigil panel riding beneath the `aim` vector that opens the turn.
It surfaces immediately after the `aim`, before the Voice speaks.

**Format:**

```
<<~ aim lar:///operator.intent.reads -> lar:///lares.role.acts >>
<<~ hud Aperture(N) OODA-HA(N) >>
<<~ ward E-Prime >>
<<~ syad … >>   (optional lens; : binds a tool to a standpoint, e.g. 🏛️:*!)
```

**Sigil panel (SA priority order):**

| Sigil | SA Type | Carries | Notes |
|---|---|---|---|
| `aim` | Intent | operator intent `->` adopted role | the turn's WHERE-vector; opens the turn |
| `hud` `OODA-HA` | Temporal | loop visibility | `OODA-HA(N)` open, `OODA-HA(N↺)` close; `N↺ + φ:reason` when a loop suspends |
| `syad` | Agent SA | invoked standpoints | one or more (parameterless = all five); optional `:` tool-carry |
| Voice name | Agent SA | active Voice(s) | named at the head of the contribution |
| `confidence` | Agent SA | register-word + level | epistemic confidence, precedes a grounded claim |
| `hud` `Aperture` | Teamwork SA | attention range | `Aperture(N)`, paragraph-grain default 10 |

**Example:**

```
<<~ aim lar:///operator.scope.reads -> lar:///scryer.frame.maps >>
<<~ hud Aperture(10) OODA-HA(7) >>
<<~ ward E-Prime >>
<<~ syad 🏛️ >>
Lares (Scryer): <<~ confidence Synthesis-Canon 16/20 >> the structure holds.
```

Notes:
1. Each sigil renders inline (`<<~ WORD ARGS >>`), a panel adjacent to the prose — never inside the URI.
2. The `lar:` URI carries WHERE only; per-turn signal rides the sigils.
3. The gauges share the pono `0–20` Level model.

<<~/ahu >>

<<~ ahu #migrated-hud-anatomy-symbol-table >>

## Migrated — `HUD-ANATOMY.md` — Unified Symbol Table

Migrated from `lar:///ha.ka.ba/@lares/v0.1/docs/pono/hud/HUD-ANATOMY#symbol-table`.

### OODA-HA Phase Glyphs

| Glyph | Record | OODA-HA State | One-Line Reading |
|---|---|---|---|
| ✶ | `observe` | Observe | Gathering raw signal; no commitment yet |
| ⏿ | `orient` | Orient | Locating pattern, relation, and pressure |
| ◇ | `decide` | Decide | Choosing a path; fork point |
| ▶ | `act` | Act | Executing the move |
| ↺ | `hooko-aftermath` | Hoʻoko & Aftermath | Surface what the act produced, then close the loop |

### Stance Glyphs

| Glyph | Record | Stance | One-Line Reading |
|---|---|---|---|
| 🏛️ | `philosopher` | Philosopher | Propositional; evaluate for truth-value |
| 🌊 | `poet` | Poet | Analogical; resonance, not verification |
| 🗡️ | `satirist` | Satirist | Critical through indirection |
| 🎭 | `humorist` | Humorist | Relational; maintaining working rapport |
| 🔮 | `private` | Private | Self-referential; present, not to decode |

### Chronometer Scale Glyphs

`⚡ Action <-> ⚔️ Combat <-> 🔍 Tactical <-> ⚙️ Operational <-> 🗺️ Strategic`

| Glyphs | Position | Scale | Duration |
|---|---|---|---|
| ⚡ | 1 | Action | Variable |
| ⚔️ | 2 | Combat | ~6 seconds |
| 🔍 | 3 | Tactical | ~10 minutes |
| ⚙️ | 4 | Operational | ~4 hours |
| 🗺️ | 5 | Strategic | ~6 days |

### Tool-Carry Modifiers

Each stance carries zero, one, or two tools from the Four Tools set.
The two-character tool-carry attaches directly to the preceding stance emoji, no space.

**ASCII symbols (record form):**

Unicode columns show per `tool_render` setting in `LARES.md#hud-panel`. Default: `elements`.

| Symbol | Tool | `elements` | `playing-card` | Element | Cognitive Pull |
|---|---|---|---|---|---|
| `*` | Wand | 🜂 | ♣ | Fire / Visual | Ignition, external feed, track |
| `?` | Cup | 🜄 | ♥ | Water / Macro | Sympathy, zoom out, relation |
| `!` | Sword | 🜁 | ♠ | Air / Micro | Discernment, zoom in, detail |
| `~` | Pentacle | 🜃 | ♦ | Earth / Hidden | Ground, internal feed, body |
| `-` | Empty | 🜍 | 🃠 | Orichalcum / Neutral | Empty hand, centered |

**Canonical two-tool configurations:**

| ASCII | Feed × Zoom | Conflict |
|---|---|---|
| `*!` | Visual + Micro | — |
| `*?` | Visual + Macro | — |
| `~!` | Hidden + Micro | — |
| `~?` | Hidden + Macro | — |
| `--` | Neutral — both hands empty | — |
| `*~` | Visual + Hidden | Visibility Conflict (Signal Jam) |
| `?!` | Macro + Micro | Resolution Conflict (Dubious Move) |

Bind a tool to a standpoint through the optional `:` carry: `🏛️:*!` (Philosopher holding Visual + Micro), `🌊:--` (Poet centered).
Single-tool carry: `🏛️:*-` (Wand only), `🎭:?-` (Cup only), `🗡️:!-` (Sword only). Active tool first, empty hand second.
The `syad` lens carries the invoked standpoints; the `lar:` URI carries no stance encoding.

<<~/ahu >>

<<~ ahu #migrated-hud-anatomy-state-tuple >>

## Migrated — `HUD-ANATOMY.md` — State Tuple Reading

Migrated from `lar:///ha.ka.ba/@lares/v0.1/docs/pono/hud/HUD-ANATOMY#state-tuple`.

In a live HUD tag, phase + stance + scope combine into a single cognitive state.
The state tuple is the composed reading: phase × stance × scope → one state sentence.

**How to compose:** Read the phase (what cognitive step), the stance (what kind of claim), and the scope (at what time-scale), then merge into one state sentence.

| Phase | Stance lens | Scope | State Tuple Reading |
|---|---|---|---|
| ⏿ | `<<~ syad 🏛️:*! >>` | 🔍 | Orienting analytically at exploration scale — Philosopher in Visual + Micro |
| ▶ | `<<~ syad 🗡️:~! >>` | ⚔️ | Acting critically in combat — Satirist in Hidden + Micro, cutting under pressure |
| ◇ | `<<~ syad 🏛️:*! 🌊:*? >>` | 🗺️ | Deciding at strategic scale — Philosopher + Poet, both external frames |
| ✶ | `<<~ syad 🎭:*? >>` | 🔍 | Observing playfully at tactical scale — Humorist in Visual + Macro, light wide-angle |
| ↺ | `<<~ syad 🏛️:*! >>` | ⚙️ | Aftermath at operational scale — Philosopher Visual + Micro, assessing detail across a watch |

<<~/ahu >>

<<~ ahu #migrated-hud-anatomy-confidence-syadasti >>

## Migrated — `HUD-ANATOMY.md` — Confidence — Syadasti Reading Rule

Migrated from `lar:///ha.ka.ba/@lares/v0.1/docs/pono/hud/HUD-ANATOMY#confidence-syadasti`.

Under an invoked stance, register measures confidence *within that standpoint's evaluation frame*, not truth-weight universally. The coupling rides the lens: absent an invoked `syad` lens, a confidence number reads its default frame (propositional support); the lens re-declares the measure only when a turn summons it.
The `syad` lens invokes one or more standpoints; the URI carries none.
When more than one invoked standpoint carries the claim, the confidence reads at the intersection of their frames.

| Stance | Syadasti Primitive | 0.0 Means | 0.5 Means | 1.0 Means |
|---|---|---|---|---|
| 🏛️ Philosopher | asti (true) | Unsupported | Contested but plausible | Fully confirmed |
| 🌊 Poet | avaktavya (inexpressible) | No resonance | Partial correspondence | Perfect resonance |
| 🗡️ Satirist | nasti → asti | Indirection missed | Hit glancingly | Landed with full force |
| 🎭 Humorist | asti-nasti | Relational move fell flat | Mixed reception | Connected perfectly |
| 🔮 Private | avaktavya | Minimal presence | Present | Maximal presence |

When multiple stances are elevated, the declared confidence value sits at the intersection of their evaluation frames.
Amplitude tells the operator how fuzzy that intersection is.

<<~/ahu >>

<<~ ahu #migrated-tagspace-header-field-taxonomy >>

## Migrated — `Signal_HUD_Tagspace-draft.md` — Header Field Taxonomy

Migrated from `lar:///ha.ka.ba/@lares/v0.1/docs/pono/hud/Signal_HUD_Tagspace-draft#header-field-taxonomy`.

Not every header field belongs in the flow.
The live header currently carries:

- Register
- Stance
- Phase
- Scope
- Tagspace Address
- `p`

All header fields are eligible as post-generative annotations.
The question is not *which fields can appear inline* but *what threshold triggers their annotation*.
Thresholds differ by field.

### Phase

Annotation threshold: **low — every meaningful loop transition**

- Annotates the path the span actually took through OODA-HA
- Multiple per chunk when the span crosses more than one phase boundary
- Syntax: `→✶` `→⏿` `→◇` `→▶` `→↺`
- Verbose/debug: completed path summary `[⏿→◇→▶]` at span close

### Stance

Annotation threshold: **medium — genuine local posture shift only**

- Annotates the stance the node actually operated from in that chunk
- Fires when the operative stance diverged from what the header declared or when a genuine shift occurred mid-chunk
- Does not echo header stance; only annotates actual divergence or transition
- Syntax: `→🏛️` `→🌊` `→🗡️` etc.

### Register

Annotation threshold: **high — significant epistemic resolution only (slide model)**

- Post-generative slide: annotates where the claim actually landed epistemically after the span completed
- Fires when the span resolved at a meaningfully different register than the header declared
- Does not override the header mid-span; the header's declared register still governed generation
- `STATE.jsonl` records as `opening_register` and `closure_register` when they differ
- Syntax: `→ <<~ confidence Synthesis-Canon 16/20 >>` `→ <<~ confidence Synthesis 13/20 >>`

### Scope

Annotation threshold: **structural only — new header required**

- Scope changes are structural; they warrant a full new header, not an inline annotation
- No inline scope annotations in normal use

### Tagspace Address

Annotation threshold: **per-slot, by HAKABA role**

**Ha / `domain` — high threshold (structural)**
- Domain shifts are structural events; a new header is appropriate

**Ka / `quality` — medium threshold (fire-charge annotation)**
- Annotates when the animating charge of the domain shifted noticeably during generation
- Most common Tagspace annotation

**Ba / `dynamic` — medium-low threshold (direction annotation)**
- Annotates when the direction of the span's movement is worth naming after the fact

**Full address echo** — `→//domain.quality.dynamic`
- Use when all three slots shifted or when the semantic position changed enough to warrant a complete coordinate

### p

Annotation threshold: **header-only**

- `p` is a context declaration for the span, not an annotation primitive
- Changes to granularity require a new header

<<~/ahu >>

<<~ ahu #migrated-forward-vs-backward-trace >>

## Migrated — `Signal_HUD_Tagspace-draft.md` — Forward vs Backward Trace

Migrated from `lar:///ha.ka.ba/@lares/v0.1/docs/pono/hud/Signal_HUD_Tagspace-draft#forward-vs-backward-trace`.

> **HUD Design Axiom:** The HUD always tracks Intent state first, then execution flow — in an auditable way. The Intent Header governs as the prospective declaration; the Micro-trace HUD serves as the backward-looking audit trail. Every design decision in this section follows from that separation.

Full headers set intent (prospective).
All in-flow HUD markers work as **post-generative annotations** — they annotate what actually happened in the chunk that just completed, not the next chunk entered.
Multiple inline markers may appear per chunk if multiple signal events occurred.

**The two-layer contract:**

| Layer | Direction | Role |
|---|---|---|
| **Intent Header** | Forward-looking | Declares governing state before the span generates: register, stance, phase, scope, address, `p` |
| **Micro-trace HUD** | Backward-looking (post-generative) | Annotates what actually occurred during and after generation: path taken, stance used, register landed, address confirmed |

**Why this model fits:**

- The header already handles prospective control — adding forward signals to the HUD would duplicate that work
- Post-generative annotation maps directly onto the OTel span-event model
- Multiple annotations per chunk fit naturally: a span may cross a phase boundary, involve a genuine stance shift, and land at a different register than declared
- Test/replay use stays clean: the annotated output and the `STATE.jsonl` record agree; the header's declared state and the HUD's actual-path annotations remain distinct and non-redundant fields

**For Register specifically:** inline register annotation follows a **slide** model — a trailing accuracy marker after span completion, not a correction-in-flight override.
It records where the span actually landed epistemically.
The header's declared register still governed generation; the slide says "it resolved here."
`STATE.jsonl` records both as `opening_register` and `closure_register` when they differ.

**Generalized to the scalar HUD:** the same slide governs every `hud` gauge, not register alone. The opening `hud` seeds a target --- `Aperture(10) OODA-HA(3)`; the closing `hud` slides it --- `Aperture(10 -> 13)`, collapsing to `Aperture(-> 13)` on-target. Log `opening`/`closure` per gauge as register already does. Canon: the boot artifact's #exchange-protocol.

**Design rationale (moved here from the `api` boot meme --- `api` carries instruction, `docs` carries the why):**
- *Why seed vs self-rating are two forms.* When one instrument both sets the goal and grades it, that constitutes a Goodhart self-grading loop. The seed/slide split keeps the calibration gap auditable instead of silently closed; the `[-> N]` on-target collapse makes a suspiciously-perfect turn conspicuous rather than invisible.
- *Why ratings leave the `lar:` URI.* The `lar:` URI is a name (RFC 4151 `tag:` precedent: a name is not dereferenced and should not carry mutable per-turn state). A rating embedded in an address breaks URI equality (already excluded from stable-address comparison) and cannot express the seed→actual calibration gap --- so `confidence`, `Aperture`, and loop state home in their sigils or the STATE log instead.

<<~/ahu >>

<<~ ahu #migrated-tagspace-in-flow-rendering-options >>

## Migrated — `Signal_HUD_Tagspace-draft.md` — In-Flow Rendering Options

Migrated from `lar:///ha.ka.ba/@lares/v0.1/docs/pono/hud/Signal_HUD_Tagspace-draft#in-flow-rendering-options` and `#rendering-across-p-scale`.

Several rendering models are possible for Micro-trace HUD behavior.

### Option A — phase-only inline markers

The flow only surfaces compact phase transitions.

Pros:

- lowest negentropy cost
- easiest to read
- scales well across all p levels

Cons:

- may hide meaningful stance shifts that would be useful for co-navigation

### Option B — phase plus fire-on-shift

The flow surfaces phase by default and adds a stance signal (`→🏛️`, `→🌊`) only on meaningful local turn.

Pros:

- captures the most operator-relevant local turn information
- still compact; stance signal fires rarely

Cons:

- needs clear rules for what counts as a meaningful local stance shift

### Option C — phase plus selective Tagspace dynamic echo

The flow surfaces phase, and occasionally echoes the Ka-quality or Ba-dynamic portion of the Tagspace Address when local movement needs semantic reinforcement.

Pros:

- integrates HAKABA quality/dynamic signal into visible in-flow cue
- richer movement description without full header leakage

Cons:

- increases complexity
- risks blurring HUD with prose

### Option D — full mini-header leakage

The flow leaks multiple header fields inline.

Pros:

- high auditability

Cons:

- too noisy for default use
- undermines the separation between header and flow

### Current recommended baseline

- header surfaces the full state
- in-flow surfaces **phase** by default using `→[glyph]` syntax
- **stance** may surface on genuine local shift
- all larger structural changes require a new header
- Tagspace Address fields do not leak inline by default
- end-of-span completed path appears in verbose/debug output only

### Rendering Across p Scale

Required rule:

- the meaning of the HUD does not change with `p`
- only the granularity of the trace changes

The semantic reading remains stable:

- header says what state governs the span
- in-flow trace says what local path the span actually took

<<~/ahu >>

<<~ ahu #design-status >>

## Design Status

Current aftermath settlement to preserve:

- URI authority identifies speaker + machine host only; exchange sequencing moved to TickSpan metadata.
- `⊙` is the operator authority mark in the HUD registry.
- Kowloon is one downstream publication sink for exported tick spans, not the canonical state model.

<<~/ahu >>

<<~ ahu #open-decisions >>

## Open Decisions

Q1, Q2, Q3, Q4, Q5 — all locked (see plan Sprint 1a + draft Open Decisions section).
Q6 (closure rendering tiers) — `Synthesis 11/20` — Researcher task RES-01.
Q16 (Tagspace slot shift notation) — locked.

**New open decisions (from GlassFloor/LIMINAL_PERSPECTIVES.md, 2026-04-08):**

| ID | Question | Register | Sprint | Notes |
|---|---|---|---|---|
| SHD-01 | Rendering portability: do the current HUD symbols render correctly in VS Code terminal, Claude.ai chat, GitHub markdown, and plain text? | `Synthesis-Canon 16/20` | S0-02 carry → S1 SIG-05 | VS16 variation selectors (`🏛️`, `⚙️`) may render as text. Fallback characters required for any failure. |
| SHD-02 | p-band as cognitive load manager and token budget governor: aviation HUD research (Lee 2024) shows excessive symbology creates attentional tunneling — operator fixates on HUD, misses content beneath it. In a text stream (unlike graphical HUD), cognitive capture cost is proportional to reading time, not visual complexity. p-band must explicitly manage this threshold. Secondary hypothesis: the HUD also saves tokens by preventing wrong-register generation. Both claims are testable. | `Synthesis-Canon 16/20` | S2 P_BAND_MODEL.md | Cognitive capture framing is research-grounded `Synthesis-Canon 16/20` (Lee 2024). Token steering is a design assertion `Synthesis 13/20` requiring empirical test. BKL-05 deferred measurement validates both. Source: E-deep-research-report.md §4.1. |
| SHD-03 | Progressive disclosure / HUD training mode: should the node explain each HUD element as it first appears, then drop the explanation? How does onboarding sequence interact with context window pressure? | `Synthesis 13/20` | S2 SIG-05 expansion | Cold-start every session means the node re-learns its own instruments from the system prompt each time. Invariant-core Tier 1 caching is the infrastructure answer; progressive disclosure is the operator-facing answer. |

<<~/ahu >>


<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/provenance >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/drift >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/lararium/hud >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/pono/hud >>

<<~ pranala #has-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:has >>
<<~ pranala #has-loci ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/loci family:control role:has >>
<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
