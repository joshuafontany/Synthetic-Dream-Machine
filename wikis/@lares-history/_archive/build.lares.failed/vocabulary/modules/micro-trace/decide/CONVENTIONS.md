<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///trace.micro.marks/micro-trace/decide/?confidence=CS~16&p=0.5 -->

# Micro-trace — Normative Rules

> Syntax and density bands. Source: `lares/signal/micro-trace.md` §§2–3 `[CS~16]`.

<!-- → ? -->
<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///trace.micro.marks/micro-trace/decide/?confidence=0.85#syntax -->
## Syntax

### Inline phase transitions

Emit at the point of transition, not predicted in advance:

```
→✶   →◎   →◇   →■   →○
```

### Stance shift

Fires only on genuine local stance shift, not to echo the header:

```
→🏛️   →🌊   →🗡️   →🎭   →🔮
```

### Named-slot Tagspace annotation (Ka or Ba shift)

Single slot:
```
→Ka[uncertain→sharp]
→Ba[opens→closes]
```

Multi-slot at span-close (HAKABA order — Ka before Ba):
```
→Ka[uncertain→sharp] →Ba[opens→closes]
```

Ha/domain reorientation significant enough to exceed annotation threshold: emit a **new Intent Header** rather than an inline slot annotation.

### End-of-span completed-path summary (verbose/debug)

```
[◎→◇→■→○]
```

<!-- → ? -->
<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///trace.micro.marks/micro-trace/decide/?confidence=0.85#density-bands -->
## Density Bands (p-controlled)

The `p` parameter gates which *categories* of transitions qualify at each band. Not a tunable salience dial — it gates transition categories by externally-observable significance.

| Band | p range | Phases emitting | What fires |
|---|---|---|---|
| 1 | `p0.0–0.2` | — | Suppress: no inline annotation |
| 2 | `p0.2–0.4` | ○ Aftermath | Closing path summary at span-close only |
| **3** | **`p0.4–0.6`** | **◇ Decide · ■ Act · ○ Aftermath** | **Commitment phases + closing summary (default at p0.5)** |
| 4 | `p0.6–0.8` | ◎ Orient + Band 3 | Adds Orient: commitment phases + processing entry point |
| 5 | `p0.8–1.0` | All five phases | Full path summary per span |

**Commitment phases** (◇ Decide / ■ Act / ○ Aftermath) are externally observable, timestamp-meaningful events — they fire at the default `p0.5` band.

**Cognitive-processing phases** (✶ Observe / ◎ Orient) are span-internal states — suppressible at operational resolution, visible at debug resolution.

KAIROS may shift the operative band mid-session (frame count ≥20 → coarser; ≤1 → finer). Declares adjustment inline, never silent.

<!-- → ? -->
