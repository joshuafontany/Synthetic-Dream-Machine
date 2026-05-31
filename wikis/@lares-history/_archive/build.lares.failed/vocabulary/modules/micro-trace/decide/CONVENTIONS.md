<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///trace.micro.marks/micro-trace/decide/?confidence=CS~16&p=10 -->

# Micro-trace — Normative Rules

> Syntax and density bands. Source: `lares/signal/micro-trace.md` §§2–3 `~:confidence[CS],[16]`.

<!-- → ? -->
<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///trace.micro.marks/micro-trace/decide/?confidence=CS~17#syntax -->
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

<!-- ∞ → lar:///trace.micro.marks/micro-trace/decide/?confidence=CS~17#density-bands -->
## Density Bands (p-controlled)

The `p` parameter gates which *categories* of transitions qualify at each band. Not a tunable salience dial — it gates transition categories by externally-observable significance.

| Band | p range | Phases emitting | What fires |
|---|---|---|---|
| 1 | `~:p[0]–~:p[4]` | — | Suppress: no inline annotation |
| 2 | `~:p[4]–~:p[8]` | ○ Aftermath | Closing path summary at span-close only |
| **3** | **`~:p[8]–~:p[12]`** | **◇ Decide · ■ Act · ○ Aftermath** | **Commitment phases + closing summary (default at ~:p[10])** |
| 4 | `~:p[12]–~:p[16]` | ◎ Orient + Band 3 | Adds Orient: commitment phases + processing entry point |
| 5 | `~:p[16]–~:p[20]` | All five phases | Full path summary per span |

**Commitment phases** (◇ Decide / ■ Act / ○ Aftermath) are externally observable, timestamp-meaningful events — they fire at the default `~:p[10]` band.

**Cognitive-processing phases** (✶ Observe / ◎ Orient) are span-internal states — suppressible at operational resolution, visible at debug resolution.

KAIROS may shift the operative band mid-session (frame count ≥20 → coarser; ≤1 → finer). Declares adjustment inline, never silent.

<!-- → ? -->
