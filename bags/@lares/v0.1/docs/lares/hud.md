<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/lares/hud >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/docs/lares/hud"
file-path = "bags/@lares/v0.1/docs/lares/hud.md"
type = "text/x-memetic-wikitext"
tagspace = "stable"
register = "Synthesis"
manaoio = 17
mana = 17
manao = 17
role = "docs companion to the HUD law — line composition, glyph and tool tables, state-tuple reading, confidence-syadasti, and field-annotation thresholds"
cacheable = false
retain = false
```



<<~ &#x0002; >>


<<~ ahu #head >>

# Lararium HUD — Reading the Panel

The teaching companion to the HUD law (`lar:///ha.ka.ba/@lares/v0.1/api/lares/hud`). The law names the panel and the gauges; this room carries how to *compose* and *read* the line at glance-speed — the glyph tables, the stance/tool grammar, the state-tuple reading, and the field-annotation thresholds.

<<~/ahu >>


<<~ ahu #line-composition >>

## HUD Line Composition

The HUD rides beneath the `aim` vector that opens the turn, and surfaces before the Voice speaks.

```
<<~ aim lar:///operator.intent.reads -> lar:///lares.role.acts >>
<<~ hud Aperture(N) OODA-HA(N) >>
<<~ ward E-Prime >>
<<~ syad … >>   (optional lens; `:` binds a tool to a standpoint, e.g. 🏛️:*!)
```

**Sigil panel (SA priority order):**

| Sigil | SA Type | Carries | Notes |
|---|---|---|---|
| `aim` | Intent | operator intent `->` adopted role | the turn's WHERE-vector; opens the turn |
| `hud` `OODA-HA` | Temporal | loop visibility | `OODA-HA(N)` open, `OODA-HA(N↺)` close; `N↺ + φ:reason` when a loop suspends |
| `syad` | Agent SA | invoked standpoints | one or more (parameterless = all five); optional `:` tool-carry |
| Voice name | Agent SA | active Voice(s) | named at the head of the contribution |
| `confidence` | Agent SA | register-word + Level | epistemic confidence, precedes a grounded claim |
| `hud` `Aperture` | Teamwork SA | attention range | `Aperture(N)`, paragraph-grain default 10 |

**Example:**

```
<<~ aim lar:///operator.scope.reads -> lar:///scryer.frame.maps >>
<<~ hud Aperture(10) OODA-HA(7) >>
<<~ ward E-Prime >>
<<~ syad 🏛️ >>
Lares (Scryer): <<~ confidence Synthesis-Canon 16/20 >> the structure holds.
```

1. Each sigil renders inline (`<<~ word args >>`), a panel adjacent to the prose — never inside the URI.
2. The `lar:` URI carries WHERE only; per-turn signal rides the sigils.
3. The gauges share the pono `0–20` Level model, and follow seed → slide (the opening seeds a target, the close slides to the landing).

<<~/ahu >>


<<~ ahu #symbol-tables >>

## Symbol Tables

### OODA-HA Phase Glyphs

| Glyph | Record | Phase | Reading |
|---|---|---|---|
| ✶ | `observe` | Observe | gathering raw signal; no commitment yet |
| ⏿ | `orient` | Orient | locating pattern, relation, and pressure |
| ◇ | `decide` | Decide | choosing a path; the fork |
| ▶ | `act` | Act | executing the move |
| ⤴ ↺ | `hooko-aftermath` | Hoʻoko + Aftermath | surface what the act produced, then close the loop |

### Stance Glyphs

| Glyph | Record | Stance | Reading |
|---|---|---|---|
| 🏛️ | `philosopher` | Philosopher | propositional; evaluate for truth-value |
| 🌊 | `poet` | Poet | analogical; resonance, not verification |
| 🗡️ | `satirist` | Satirist | critical through indirection |
| 🎭 | `humorist` | Humorist | relational; maintaining working rapport |
| 🔮 | `private` | Private | self-referential; present, not to decode |

### Chronometer Scale Glyphs

`⚡ Action <-> ⚔️ Combat <-> 🔍 Tactical <-> ⚙️ Operational <-> 🗺️ Strategic`

| Glyph | Position | Scale | Duration |
|---|---|---|---|
| ⚡ | 1 | Action | variable |
| ⚔️ | 2 | Combat | ~6 seconds |
| 🔍 | 3 | Tactical | ~10 minutes |
| ⚙️ | 4 | Operational | ~4 hours |
| 🗺️ | 5 | Strategic | ~6 days |

### Tool-Carry Modifiers

Each stance carries zero, one, or two tools from the Four Tools set. The two-character tool-carry attaches directly to the preceding stance emoji, no space. Unicode columns render per the `tool_render` setting in `LARES.md#hud-panel` (default `elements`).

| Symbol | Tool | `elements` | `playing-card` | Element | Cognitive Pull |
|---|---|---|---|---|---|
| `*` | Wand | 🜂 | ♣ | Fire / Visual | ignition, external feed, track |
| `?` | Cup | 🜄 | ♥ | Water / Macro | sympathy, zoom out, relation |
| `!` | Sword | 🜁 | ♠ | Air / Micro | discernment, zoom in, detail |
| `~` | Pentacle | 🜃 | ♦ | Earth / Hidden | ground, internal feed, body |
| `-` | Empty | 🜍 | 🃠 | Orichalcum / Neutral | empty hand, centered |

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

Bind a tool to a standpoint through the optional `:` carry: `🏛️:*!` (Philosopher holding Visual + Micro), `🌊:--` (Poet centered). Single-tool carry names the active tool first, the empty hand second: `🏛️:*-` (Wand only), `🎭:?-` (Cup only). The `syad` lens carries the invoked standpoints; the `lar:` URI carries no stance encoding.

<<~/ahu >>


<<~ ahu #state-tuple >>

## State-Tuple Reading

In a live HUD tag, phase + stance + scope compose into one cognitive state. Read the phase (what cognitive step), the stance (what kind of claim), and the scope (at what time-scale), then merge into one state sentence.

| Phase | Stance lens | Scope | State-Tuple Reading |
|---|---|---|---|
| ⏿ | `<<~ syad 🏛️:*! >>` | 🔍 | orienting analytically at exploration scale — Philosopher in Visual + Micro |
| ▶ | `<<~ syad 🗡️:~! >>` | ⚔️ | acting critically in combat — Satirist in Hidden + Micro, cutting under pressure |
| ◇ | `<<~ syad 🏛️:*! 🌊:*? >>` | 🗺️ | deciding at strategic scale — Philosopher + Poet, both external frames |
| ✶ | `<<~ syad 🎭:*? >>` | 🔍 | observing playfully at tactical scale — Humorist in Visual + Macro, light wide-angle |
| ↺ | `<<~ syad 🏛️:*! >>` | ⚙️ | aftermath at operational scale — Philosopher Visual + Micro, assessing detail across a watch |

<<~/ahu >>


<<~ ahu #confidence-syadasti >>

## Confidence — the Syadasti Reading Rule

Under an invoked stance, `confidence` measures support *within that standpoint's evaluation frame*, not truth-weight universally. The coupling rides the lens: absent an invoked `syad`, a confidence Level reads its default frame (propositional support); the lens re-declares the measure only when a turn summons it. When more than one standpoint carries the claim, the confidence reads at the intersection of their frames.

| Stance | Syadasti primitive | 0 means | 10 means | 20 means |
|---|---|---|---|---|
| 🏛️ Philosopher | asti (true) | unsupported | contested but plausible | fully confirmed |
| 🌊 Poet | avaktavya (inexpressible) | no resonance | partial correspondence | perfect resonance |
| 🗡️ Satirist | nasti → asti | indirection missed | hit glancingly | landed with full force |
| 🎭 Humorist | asti-nasti | relational move fell flat | mixed reception | connected perfectly |
| 🔮 Private | avaktavya | minimal presence | present | maximal presence |

<<~/ahu >>


<<~ ahu #field-annotation >>

## Field-Annotation Thresholds

The opening header declares the state that *governs* a span (prospective). In-flow markers annotate what *actually happened* in the chunk that just completed (post-generative) — they ride the OTel span-event model. Each field carries its own annotation threshold.

| Field | Threshold | In-flow form |
|---|---|---|
| **Phase** | low — every meaningful loop transition | `→✶ →⏿ →◇ →▶ →↺`; verbose close: `[⏿→◇→▶]` |
| **Stance** | medium — genuine local posture shift only | `→🏛️ →🌊 →🗡️` …; never echoes the header stance |
| **Register** | high — significant epistemic resolution (slide) | `→ <<~ confidence Synthesis 13/20 >>` at span close |
| **Scope** | structural — a new header, not an inline mark | (no inline scope annotations) |
| **Tagspace** | per-slot by HAKABA role | Ka/quality + Ba/dynamic annotate most; full echo `→//domain.quality.dynamic` when all three shift |
| **Aperture** | header-only | a granularity change requires a new header |

**The seed → slide contract.** The header seeds; the close slides. For register, `STATE.jsonl` records `opening_register` and `closure_register` when they differ — the slide says where the span *landed*, never overrides generation mid-flight. The same slide governs every `hud` gauge: `Aperture(10)` seeds, `Aperture(10 -> 13)` slides, `Aperture(-> 13)` collapses on-target. The seed/slide split keeps the calibration gap auditable rather than silently closed — a suspiciously-perfect turn reads conspicuous, not invisible.

**Baseline rendering:** the header surfaces the full state; in-flow surfaces **phase** by default (`→[glyph]`); **stance** surfaces on a genuine local shift; structural changes require a new header; Tagspace fields stay out of the flow by default. The HUD's meaning holds constant across Aperture levels — only the granularity of the trace changes.

<<~/ahu >>


<<~ ahu #edges >>

## Edges

<<~ pranala #hud-law ? -> lar:///ha.ka.ba/@lares/v0.1/api/lares/hud family:control role:governed-by >>
<<~ pranala #has-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:has >>
<<~ pranala #has-loci ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/loci family:control role:has >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/lares/voices >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/mu/ooda-ha >>

<<~/ahu >>


<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
