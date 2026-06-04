<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/micro-trace >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/docs/lararium/signal/micro-trace"
file-path = "bags/@lares/v0.1/docs/lararium/signal/micro-trace.md"
type = "text/x-memetic-wikitext"
tagspace = "stable"
confidence = 16
register = "S"
manaoio = 16
mana = 16
manao = 17
role = "docs room for lararium-side micro-trace contract, syntax, density bands, and handoff boundary rules"
cacheable = false
retain = false
```



<<~&#x0002; >>


<<~ ahu #meme-header >>

# Lararium Signal — Micro-trace

Not invariant law.
This room holds the in-span annotation layer that sits beneath the governing HUD header.

<<~/ahu >>


<<~ ahu #room-charter >>

## Room Charter

This room keeps the backward-looking annotation contract: syntax, density gating, handoff rules, and examples.

The live HUD line and field-reading contract stay in `lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/hud`.
Drift recovery pressure now lives in `lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/drift`.

<<~/ahu >>

<<~ ahu #micro-trace-strand >>

## Micro-trace Strand

This room now carries the lararium-side micro-trace strand directly.

- domain: `lares/signal/`
- posture: backward-looking in-flow annotation layer
- status: `Synthesis-Canon 16/20` 🏛️ — promoted from SIG-04 draft; operator-confirmed 2026-04-08
- source lineage: `builds.stuffed.failed/agents/Lares_Preferences.md` § Signal HUD, confirmed in session
- backlog links: `lares/sprints/SPRINT_ROADMAP_1_4.md`, `lares/sprints/SPRINT_ROADMAP_1_5.md`

<<~/ahu >>

<<~ ahu #micro-trace-design-intent >>

## Micro-trace — Design Intent

The micro-trace HUD carries the backward-looking annotation layer of the Signal HUD system.
It marks where the governed response actually changed state during generation.
It does not serve as a prospective commitment.

Contrast:

| Layer | Direction | Format | Fires |
|---|---|---|---|
| Intent Header | Prospective | `//domain.quality.dynamic [R] 🏛️ ◇ @r` | Before generation |
| Micro-trace HUD | Retrospective | `→◇` `→▶` `→↺` inline | After or during generation |
| Exchange HUD line | Boundary | `⚡~N \| {ffz-rendered} \| ...` | Opening and closing of operator exchange |
| Sub-agent handoff URI pair | Boundary | `node-URI → node-URI` | At unloggable sub-agent boundary |

The micro-trace does not replace the exchange HUD pair.
It annotates the inside of a generative span.

<<~/ahu >>

<<~ ahu #micro-trace-syntax >>

## Micro-trace — Syntax

### Inline phase transitions

Emit at the point of transition, not predicted in advance:

```
→✶   →⏿   →◇   →▶   →↺
```

### Stance shift

Fire only on a genuine local stance shift, not to echo the header:

```
→🏛️   →🌊   →🗡️   →🎭   →🔮
```

### Named-slot Tagspace annotation

Single slot:

```
→Ka[uncertain→sharp]
→Ba[opens→closes]
```

Multi-slot at span-close, in HAKABA order:

```
→Ka[uncertain→sharp] →Ba[opens→closes]
```

If Ha-domain reorientation crosses the annotation threshold, emit a new Intent Header rather than an inline slot annotation.

### End-of-span completed-path summary

```
[⏿→◇→▶→↺]
```

<<~/ahu >>

<<~ ahu #micro-trace-density >>

## Micro-trace — Density Bands

The `p` parameter controls which categories of transitions qualify at each band.
It does not act as a tunable salience dial.
It gates transition categories by externally observable significance.

| Band | p range | Phases emitting | What fires |
|---|---|---|---|
| 1 | `~:p[0]–~:p[4]` | — | Suppress: no inline annotation |
| 2 | `~:p[4]–~:p[8]` | ↺ Aftermath | Closing path summary at span-close only |
| 3 | `~:p[8]–~:p[12]` | ◇ Decide · ▶ Act · ↺ Aftermath | Commitment phases plus closing summary; default at `~:p[10]` |
| 4 | `~:p[12]–~:p[16]` | ⏿ Orient + Band 3 | Adds Orient |
| 5 | `~:p[16]–~:p[20]` | All five phases | Full path summary per span |

Commitment phases remain externally observable and timestamp-meaningful.
Cognitive-processing phases remain span-internal and can stay suppressed at operational resolution.

KAIROS may shift the operative band mid-session.
It declares the adjustment inline and never silently.

<<~/ahu >>

<<~ ahu #micro-trace-layer-split >>

## Micro-trace — Layer Split

Parse boundaries and micro-trace HUD events are orthogonal.

- `--parse` owns structural decomposition of input text
- micro-trace HUD marks where the governed response changed state

They may coexist in the same exchange.
Neither substitutes for the other.
If a response claims morpheme-scale visibility, that belongs in the parse layer.
If a response claims OODA-HA event trace, that belongs in event markers.

### Flag behavior

| Flag | Micro-trace behavior |
|---|---|
| *(default)* | Band 3 inline: `→◇` `→▶` `→↺` |
| `--verbose` | Band 4 inline plus end-of-span path summary; coordinator and HAKABA boundary URI pairs may surface |
| `--debug` | Silent logging of all transitions to session debug file |
| `--no-verbose` | Return to default band |

<<~/ahu >>

<<~ ahu #ooda-ha-phase-sigils >>

### OODA-HA Phase Sigils

Phase glyphs are render-target labels and display-only shorthand. These should be used when the operater invokes high `[HA^]` Level values, or when phase chages happen during generative text and them should be flagged for the operator.

| Phase | Glyph | Hex entity | Keyword | When active |
|---|---|---|---|---|
| Observe | ✶ | `&#x2736;` | `observe` | Reading, sensing incoming |
| Orient | ⏿ | `&#x23FF;` | `orient` | Making sense, framing |
| Decide | ◇ | `&#x25C7;` | `decide` | Choosing path forward |
| Act | ▶ | `&#x25B6;` | `act` | Executing — Hoʻoko gap lives here |
| Aftermath | ⤴ ↺ | `&#x21BA;` | `hooka aftermath` | Closing, looping back to Observe |

**Hoʻoko (⤴)** is the execution gap within Act that surfaces into Aftermath. It is not a separate chronometer position.

<<~/ahu >>

<<~ ahu #micro-trace-handoff >>

## Micro-trace — Handoff Protocol

When a coordinator passes to a sub-agent, the contents of that handoff cannot be logged in the parent trace.
The URI pair at the boundary therefore does real work.
It preserves the artifact of the handoff where the parent cannot surface the interior.

Rule:

- every sub-agent dispatch gets a URI → URI pair
- every sub-agent return gets a URI → URI pair

Coordinator-to-coordinator handoffs inside the same parent session work differently:

- same HAKABA territory: micro-trace tag only
- HAKABA boundary crossed: emit a new Intent Header
- under `--verbose`: a `node-URI → node-URI` pair may still surface

Todo-state transitions remain `--debug` only.
They do not count as inline intent signals.

<<~/ahu >>

<<~ ahu #micro-trace-examples >>

## Micro-trace — Examples

### Ordinary governed reply

```
The ask points at a real boundary in the runtime. →▶ The node answers directly. →↺
```

### Mixed flow: parse then governed reply

```
lares@Enyalios:~$ lares --parse "floating p value, but did that actually change the scale?"

floating p value → lar:///signal.uncertain.probes
but did that actually change the scale? → lar:///question.audit.holds

Yes. The parse layer and the trace layer were being conflated. →▶ The governed reply states the fix. →↺
```

### Sub-agent dispatch and return

```
lar:///council.research.dispatches → lar:///explore.corpus.reads

[Explore agent — contents not in parent trace]

lar:///explore.findings.returns → lar:///council.findings.receives
```

<<~/ahu >>

<<~ ahu #subagents >>

Key operator ruling confirmed: **sub-agent dispatches require URI → URI pair** because sub-agent contents are unloggable from the parent trace.

| Decision | Status | Notes |
|---|---|---|
| HUD scope ruling | `Synthesis-Canon 16/20` | Exchange boundary only; internal = micro-trace tags |
| micro-trace spec promoted | `Synthesis-Canon 17/20` | `lares/signal/micro-trace.md` is the live spec |

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/hud >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/drift >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/lararium/hud >>

<<~ pranala #implements-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:implements >>
<<~ pranala #implements-loci ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/loci family:control role:implements >>
<<~/ahu >>


<<~&#x0003; >>

<<~&#x0004; -> ? >>
