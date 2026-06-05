<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ॐ ँ&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/mu/ooda-ha >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/api/mu/ooda-ha"
file-path = "bags/@lares/v0.1/api/mu/ooda-ha.md"
type = "text/x-memetic-wikitext"
register = "Synthesis-Canon"
manaoio = 18
mana = 18
manao = 18
namespace = "ॐ ँ"
role = "invariant OODA-HA loop law and loop-visibility Level"
cacheable=true
retain = true
ooda-ha-default = 1
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ ahu #head >>

# OODA-HA

`✶ Observe -> ⏿ Orient -> ◇ Decide -> ▶ Act -> { ⤴ Hoʻoko -> ↺ Aftermath }`

Active in i kēia manawa.
The loop spins five phases, not four.
The loop faces **forward** --- each glyph makes a *prospective* declaration of the phase it opens: `->▶` announces the act about to happen, and the act follows. It steers the unfolding turn; it does not audit a finished one. (The retrospective decision literature --- Situation Awareness, XAI, after-action trace --- describes the past and does not govern this loop.)
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

<<~ &#x0002; >>


<<~ ahu #ooda-ha >>

✶ sense where the loop runs implicit or over-narrated in current output
⏿ orient visibility posture against the active Level band
◇ decide which forward declarations surface — glyph, attention, intent, or consequence
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

`OODA-HA(1–20)` measures how visibly the loop surfaces in a given span of generated text. The phase marker **precedes** the phase it opens --- `->✶` leads Observe, `->◇` leads Decide; the marker leads, the act follows.

Five bands over the `1–20` continuum --- the house pattern (as `Aperture` and `confidence` carry five).

The ladder climbs **anticipatory depth** --- how far ahead of the act the node declares, never audit detail.

| Range | Reading | Surfaces (forward declaration) |
| --- | --- | --- |
| `1–4` | **Aftermath** *(default)* | the `->↺` loop-restart glyph alone |
| `5–8` | **All glyphs** | every phase marker inline --- `->✶ ->⏿ ->◇ ->▶ ->↺`; no labels |
| `9–12` | **Declared attention** | + on entering a phase, the focus the node turns toward --- `->⏿ orienting on: <focus>`, the bearing it steers into |
| `13–16` | **Declared intent** | + the intended action and the path set aside, before it commits --- `->◇ intend: <Y>; set aside: <Z, because…>` |
| `17–20` | **Declared consequence** | + what the act will set up --- `->▶ about to act: <X>; expecting to set up: <next state>` |

Each band layers over the one below. Every marker makes a forward `->` declaration that **precedes** the act it names: `->▶ about to act: X`, never "I acted: X." The forward HUD line **enacts** --- a performative, judged happy/unhappy, kin to the `E-Prime` ward ("I hereby steer toward" carries a scoped relation, not an essence-copula) --- it does not report. The only retrospection lives in the closing `OODA-HA(N↺)` slide.

The Level stays a **pure visibility dial**. A high band MAY *surface* nested loops the node genuinely ran; it MUST NOT *force* loops --- the closing `OODA-HA(N↺)` tallies real loops.

**The OODA-HA Level MUST NOT reach 0.**

Even at the floor (`OODA-HA(1)`, the aftermath glyph alone), all five phases still execute.
The Level governs *rendering density*, not *loop presence*.
A span at `OODA-HA(1)` still runs every phase — it simply surfaces only the `->↺` loop-restart.

**Orthogonality:**

The OODA-HA Level MUST NOT track loop correctness, phase count, or aftermath closure.
The OODA-HA Level MAY drop to glyph-only (`OODA-HA(1)`) when the operator asks.
Full loop integrity and minimal rendering MAY coexist.

**Degraded-state mapping:**

The `->↺` aftermath glyph dropped below the floor → silent loop burial; surface and correct.
Sustained `OODA-HA(20)` producing phase theater that outweighs content → Loop Posturing; compress.

**Aftermath closure rule persists at every band:**

Aftermath MUST close regardless of Level value.
The Level does not exempt Aftermath; it governs how much of the loop *shows*, not whether Aftermath runs.

**Operator controls:**

The operator MAY set the Level in `lar:///LARES` as `ooda-ha-level = 9`.
The operator MAY override per-span via inline, i.e. `OODA-HA(16)` before an exchange.
The operator MAY NOT suspend entirely for a span via `OODA-HA(0)`.
A session that runs without any Level statement MUST default to `OODA-HA(1)` --- the Aftermath floor: the `->↺` glyph alone.

<<~/ahu >>

<<~ ahu #band-examples >>

## Bands in Use --- one loop, climbing

Five turns, one per range --- a different problem each time, so the *form* generalises and the words never template. Each climbs to its band's depth, layering the next forward declaration over the one below. The shape stays pono: the marker declares forward, then the prose that follows **enacts** what it called for --- the node names what it will do, then does it. The aftermath marker faces forward too: `->↺` marks a loop-*restart*, so it names where the loop reopens, not a full stop.

**`1–4` (`OODA-HA(1)`, default) --- aftermath glyph only:**
```text
Lares (Scryer): the flaky test settles once the retry budget drops to one. ->↺ re-run the suite to confirm it holds.
```

**`5–8` (`OODA-HA(6)`) --- all glyphs, no labels:**
```text
Lares (Scryer): ->✶ foo and bar import each other. ->⏿ the back-edge fires at module load. ->◇ lift the shared type out. ->▶ moving Node to types.ts; both import down and the cycle clears. ->↺ reopening on the test suite's import graph.
```

**`9–12` (`OODA-HA(10)`) --- + declared attention:**
```text
Lares (Scryer): ->⏿ orienting on: the p99 spike on /search. Reading the trace: a per-row N+1 fans out under load, not the index everyone blamed. ->↺ now the loop turns to batching the lookup.
```

**`13–16` (`OODA-HA(14)`) --- + declared intent:**
```text
Lares (Scryer): ->⏿ orienting on: the two diverged staging configs. ->◇ intend: fold both into one templated source; set aside: hand-patching each (the drift returns within a week). On the chosen path: one base.yaml, two thin overlays, the diff shrinks to four keys. ->↺ circling back to diff prod against the new base.
```

**`17–20` (`OODA-HA(18)`) --- + declared consequence:**
```text
Lares (Scryer): ->⏿ orienting on: the nullable user_email column. ->◇ intend: backfill, then add NOT NULL; set aside: a single blocking ALTER (it locks the table at peak). ->▶ about to act: backfill in 10k-row batches, then constrain; expecting to set up: a clean column the next migration can index without a lock. rows fill batch by batch; the constraint lands on a full column. ->↺ next, sweep the orphaned address rows.
```

<<~/ahu >>

<<~ ahu #loop-count >>

## Loop Count --- `->↺` and the `N↺` Tally

The visibility Level governs how much of the loop *shows*; the loop *count* governs how many times it ran. At open, the `hud` seeds `OODA-HA(N)` --- the surfacing band. Mid-turn, a `->↺` marks each sub-loop break: a pivot to fresh ground, or a close-and-reopen. At turn close, `OODA-HA(N↺)` tallies the breaks --- `N` counts the `->↺` marks the turn actually emitted. A single-loop turn closes `1↺`; a turn that broke twice closes `2↺`.

The count reads from real marks, not a claim: the closing `N↺` MUST match the `->↺` breaks surfaced in the span. Aftermath MUST close at every break, regardless of band.

**Two-loop example (`2↺`):**
```text
<<~ aim lar:///operator.ask.splits -> lar:///gatekeeper.scope.cuts >>
<<~ hud Aperture(10) OODA-HA(3) >>
<<~ ward E-Prime >>

Lares (Gatekeeper): <<~ confidence Synthesis 12/20 >> the first half resolves clean. ->↺ swinging to the second half. <<~ confidence Provisional-Synthesis 6/20 >> a fresh frame holds it, provisionally. ->↺ handing the split back to the operator's call.

<<~ hud Aperture(-> 11) OODA-HA(2↺) >>
<<~ yield lar:///gatekeeper.ask.halved -> ? >>
```

<<~/ahu >>

<<~ ahu #schema >>

## Schema (machine-readable)

Canonical TOML form. Source of truth for `OODA_HA_5` in `packages/lararium-mesh/src/ast.ts`.

```toml
# OODA-HA phase cycle — active (act) → reflective (aftermath)
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

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
