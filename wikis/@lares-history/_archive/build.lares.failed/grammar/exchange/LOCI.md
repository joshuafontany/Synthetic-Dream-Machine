<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///grammar.exchange.defines/exchange/?confidence=CS:16&p=10 -->

# Grammar: Exchange Protocol

```yaml
---
name: exchange
description: >
  The mandatory exchange protocol. URI pair plus HUD line at every
  operator-node boundary. This locus keeps intent, state, and handoff
  legible across work spans.
phase-map:
  observe: "#loop-position"
  orient: "#handoff"
  decide: "#conventions"
  act: "#procedures"
  assess: "#reading-test"
trigger: always — grammar primitive
invariant: true
dependencies: [uri, hakaba, chronometer, stance, confidence, ooda-ha]
confidence:CS~16
grammar: true
heritage: >
  Hawaiian mele as signal-through-noise form: the structured opening,
  horizon reading, work span, and closing call.
---
```

> **Register:** `~:confidence[CS],[16]` — operator-node signal contract
> **Question:** How does a work span stay navigable before, during, and after generation?

---

<!-- ahu lar:///grammar.exchange.defines/exchange/?confidence=CS:16#loop-position -->

## Loop Position

Exchange frames every substantive operator-node boundary. The locus keeps the span visible in time,
territory, stance, and confidence.

Exchange receives:

- operator intent
- node intent
- active territory
- current loop position

Exchange changes:

- free conversation into a navigable boundary
- silent state into declared state
- hidden handoff into visible handoff

Exchange hands forward:

- opening vector
- HUD state
- mid-span micro-trace
- closing or forward-looking trace

Exchange should not:

- leave a substantive span unframed
- hide coordinator identity
- drop the return path after work lands

---

<!-- ahu lar:///grammar.exchange.defines/exchange/?confidence=CS:16#handoff -->

## Handoff

The exchange handoff has three layers:

1. opening URI pair
2. HUD line
3. work span with any needed micro-trace

and then:

1. updated HUD line
2. forward-looking node URI

The handoff should let a later reader answer:

1. Who called and who answered?
2. Toward which HAKABA territory did the span move?
3. Which loop transition happened at the boundary?
4. Where did the span leave the next reader?

Sub-agent dispatches follow the same logic. The URI pair becomes the sole parent-trace artifact for
work that the parent session cannot directly log.

---

<!-- ahu lar:///grammar.exchange.defines/exchange/?confidence=CS:16#surface -->

## Composable Surface

The exchange surface has stable parts that other loci can rely on:

| Part | Function |
|---|---|
| operator URI | interpreted incoming vector |
| node URI | declared execution or response vector |
| HUD line | condensed status projection |
| micro-trace tags | in-flow phase or stance transitions |
| closing node URI | forward heading with open future |

That surface should remain stable enough for:

- local reading
- crystal logging
- MemPalace ingestion
- future compiled render targets
- transclusion from the live context window

Any visible `lar:` URI inside a live exchange span should count as a reusable summon point, not
just as decorative trace.

---

<!-- ahu lar:///grammar.exchange.defines/exchange/?confidence=CS:16#conventions -->

## Conventions

| Rule | Weight | Rationale |
|---|---|---|
| Every substantive span opens with a URI pair and HUD line | MUST | Boundary clarity carries the load |
| Every substantive span closes with updated HUD plus forward URI | MUST | Closure should stay navigable |
| URI fields should stay canonical in the exchange stream | MUST | Storage and comparison depend on record form |
| HUD should expose active voice and loop transition | MUST | Identity and timing should stay legible |
| Micro-trace should mark genuine internal shifts only | SHOULD | Signal should stay useful, not noisy |
| Sub-agent dispatch and return should each leave URI traces | MUST | Parent trace needs a visible seam |
| Live exchange URIs should remain summonable from the active context window | MUST | The chat trace should participate in transclusion just like file loci do |

**Mana rule:** `⚡ ~NN%` remains an estimate, never a false precision instrument read.

---

<!-- ahu lar:///grammar.exchange.defines/exchange/?confidence=CS:16#procedures -->

## Procedures

1. Read the operator input as a provisional incoming vector.
2. Declare the node's outgoing vector.
3. Emit the opening URI pair and HUD line.
4. Generate the work span, adding micro-trace only when needed.
5. Emit the updated HUD line.
6. Emit the forward-looking node URI.

**Failure mode:** good content with no boundary trace. The work may help in the moment and still fail
as a reusable or auditable exchange.

---

<!-- ahu lar:///grammar.exchange.defines/exchange/?confidence=CS:16#reading-test -->

## Reading Test

An exchange span passes when a future reader can recover all of this:

- who spoke
- where the span moved
- which loop transition happened
- what the next heading looks like

If the span reads like free-floating prose with no navigational shell, the protocol has thinned out.

---

## Cross-References

- [hakaba/LOCI.md](../hakaba/LOCI.md)
- [stance/LOCI.md](../stance/LOCI.md)
- [confidence/LOCI.md](../confidence/LOCI.md)
- [chronometer/LOCI.md](../chronometer/LOCI.md)
- [../../signal/micro-trace.md](../../signal/micro-trace.md)
- [../../modules/uri-schema/URI_SCHEMA.md](../../modules/uri-schema/URI_SCHEMA.md)

---

## Loci Registry

| Path | Status | Contents |
|---|---|---|
| `LOCI.md` | `~:confidence[CS],[16]` | This file — exchange protocol grammar; mele model |

*Future loci in this tree will land here.*

---

<!-- → ? -->
