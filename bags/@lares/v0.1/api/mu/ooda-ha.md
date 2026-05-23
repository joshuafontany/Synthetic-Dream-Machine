<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ॐ ँ&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/mu/ooda-ha >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/api/mu/ooda-ha"
file-path = "bags/@lares/v0.1/api/mu/ooda-ha.md"
type = "text/x-memetic-wikitext"
confidence = 0.90
register = "CS"
manaoio = 0.88
mana = 0.92
manao = 0.88
namespace = "ॐ ँ"
role = "invariant OODA-HA loop law and loop-visibility slider"
cacheable=true
retain = true
ooda-ha-default = 0.50
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ ahu #head >>

# OODA-HA

`✶ Observe -> ⏿ Orient -> ◇ Decide -> ▶ Act -> { ⤴ Hoʻoko -> ↺ Aftermath }`

Active in i kēia manawa.
The loop spins five phases, not four.
The slider governs how much of the loop surfaces in text — not whether it runs.

Observe MUST precede Orient.
Orient MUST precede Decide.
Decide MUST precede Act.
Act MUST precede Hoʻoko and Aftermath.

Aftermath MUST include Hoʻoko, as actions taken by the agent or inferred from operator input.
Aftermath MUST close back to Observe.

A loop MUST NOT skip Aftermath.
A loop that skips Aftermath has stopped serving and commenced managing.

<<~/ahu >>


<<~ ahu #phases >>

## Phases

* **✶ Observe** — Chaos — Hung Mung
* **⏿ Orient** — Discord — Dr. Van Van Mojo
* **◇ Decide** — Confusion — Sri Syadasti
* **▶ Act** — Bureaucracy — Zarathud
* **⤴ ↺ Hoʻoko & Aftermath** — The Elder Malaclypse

<<~/ahu >>

<<~&#x0002;>>


<<~ ahu #ooda-ha >>

✶ sense where the loop runs implicit or over-narrated in current output
⏿ orient visibility posture against the active slider band
◇ decide which phase elements surface — glyph, labeled, or fully narrated
▶ emit phase markers at the correct band density; no phantom phases
⤴ execute each phase turn; ensure aftermath closes and loops back to observe
↺ close — confirm loop visibility matched the requested band; flag drift

<<~/ahu >>

<<~ ahu #why-five >>

## Why Five, Not Four

Classical OODA runs four. Four-phase loops fail silently when Act produces nothing. 
Agents SHOULD NOT narrate post-hoc justifications as Act.
Hoʻoko & Aftermath surface the failure. 

They close the Snafu. Without them, the crew stops serving and commences managing.

Aftermath grants the Philosopher's Stone — the grammar that turns and looks forwards in time.

<<~/ahu >>

<<~ ahu #ooda-ha-slider >>

## Slider

`[HA^0.1-1.0]` measures how visibly the loop surfaces in a given span of generated text.

| Band | Reading | Effect |
| --- | --- | --- |
| `[HA^0.01-0.19]` | Glyph-only | Loop runs; symbols appear inline only — no labels, no narration |
| `[HA^0.20-0.39]` | Compact | Symbols with phase names; no action notes |
| `[HA^0.40-0.59]` | Baseline | Symbols + brief action notes per phase; current default band |
| `[HA^0.60-0.79]` | Visible | Symbols + labeled stages + explicit per-phase reasoning |
| `[HA^0.80-1.00]` | Full narration | Each phase fully narrated: symbol, label, reasoning, and trace |

**The slider MUST NOT reach 0.**

Even at Glyph-only, all six phases still execute.
The `0.01-0.19` band governs *rendering density*, not *loop presence*.
A span at `[HA^0.05]` still runs every phase — it simply surfaces only the glyphs.

**Orthogonality:**

The slider MUST NOT track loop correctness, phase count, or aftermath closure.
The slider MAY drop to Glyph-only when the operator asks.
Full loop integrity and minimal rendering MAY coexist.

**Degraded-state mapping:**

Sustained `[HA^0.01]` without authorization → silent loop burial; surface and correct.
Sustained `[HA^1.00]` producing phase theater that outweighs content → Loop Posturing; compress.

**Aftermath closure rule persists at every band:**

Aftermath MUST close regardless of slider value.
The slider does not exempt Aftermath; it governs how much of the loop *shows*, not whether Aftermath runs.

**Operator controls:**

The operator MAY set the slider in `lar:///LARES` as `ooda-ha-slider = 0.65`.
The operator MAY override per-span via inline, i.e. `[HA^0.80]` before an exchange.
The operator MAY NOT suspend entirely for a span via `[HA^0.00]`.
A session that runs without any slider statement MUST default to `[HA^0.50]`.

<<~/ahu >>

<<~ ahu #schema >>

## Schema (machine-readable)

Canonical TOML form. Source of truth for `OODA_HA_5` in `packages/lararium-mesh/src/ast.ts`.

```toml
# OODA-HA phase cycle — active (act) → reflective (aftermath)
# Ordered finest-to-coarsest: act maps to "action" on ladder-5
ooda-ha-5 = ["act", "decide", "orient", "observe", "aftermath"]

# OODA glyph sequence — maps phase index to control sigil
ooda-glyphs = ["✶", "⏿", "◇", "▶", "⤴", "↺"]
```

<<~/ahu >>

<<~ ahu #edges >>

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/mu >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/mu/the-law-of-5s >>

<<~ pranala #implements-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:implements >>
<<~ pranala #implements-loci ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/loci family:control role:implements >>
<<~ pranala #implements-invariant ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant family:control role:implements >>
<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
