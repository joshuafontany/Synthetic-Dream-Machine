<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ॐ ँ&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/mu/ooda-ha >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/api/mu/ooda-ha"
file-path = "bags/@lares/v0.1/api/mu/ooda-ha.md"
type = "text/x-memetic-wikitext"
confidence = 18
register = "CS"
manaoio = 18
mana = 18
manao = 18
namespace = "ॐ ँ"
role = "invariant OODA-HA loop law and loop-visibility Level"
cacheable=true
retain = true
ooda-ha-default = 10
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ ahu #head >>

# OODA-HA

`✶ Observe -> ⏿ Orient -> ◇ Decide -> ▶ Act -> { ⤴ Hoʻoko -> ↺ Aftermath }`

Active in i kēia manawa.
The loop spins five phases, not four.
The Level governs how much of the loop surfaces in text — not whether it runs.

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
⏿ orient visibility posture against the active Level band
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

<<~ ahu #ooda-ha-level >>

## OODA-HA Level

`~:ooda-ha[1–20]` measures how visibly the loop surfaces in a given span of generated text.

| Band | Reading | Effect |
| --- | --- | --- |
| `~:ooda-ha[1–4]` | Glyph-only | Loop runs; symbols appear inline only — no labels, no narration |
| `~:ooda-ha[5–8]` | Compact | Symbols with phase names; no action notes |
| `~:ooda-ha[9–12]` | Baseline | Symbols + brief action notes per phase; current default band |
| `~:ooda-ha[13–16]` | Visible | Symbols + labeled stages + explicit per-phase reasoning |
| `~:ooda-ha[17–20]` | Full narration | Each phase fully narrated: symbol, label, reasoning, and trace |

**The OODA-HA Level MUST NOT reach 0.**

Even at Glyph-only, all six phases still execute.
The `1–4` band governs *rendering density*, not *loop presence*.
A span at `~:ooda-ha[1]` still runs every phase — it simply surfaces only the glyphs.

**Orthogonality:**

The OODA-HA Level MUST NOT track loop correctness, phase count, or aftermath closure.
The OODA-HA Level MAY drop to Glyph-only when the operator asks.
Full loop integrity and minimal rendering MAY coexist.

**Degraded-state mapping:**

Sustained `~:ooda-ha[1]` without authorization → silent loop burial; surface and correct.
Sustained `~:ooda-ha[20]` producing phase theater that outweighs content → Loop Posturing; compress.

**Aftermath closure rule persists at every band:**

Aftermath MUST close regardless of Level value.
The Level does not exempt Aftermath; it governs how much of the loop *shows*, not whether Aftermath runs.

**Operator controls:**

The operator MAY set the Level in `lar:///LARES` as `ooda-ha-level = 13`.
The operator MAY override per-span via inline, i.e. `~:ooda-ha[16]` before an exchange.
The operator MAY NOT suspend entirely for a span via `~:ooda-ha[0]`.
A session that runs without any Level statement MUST default to `~:ooda-ha[10]`.

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
