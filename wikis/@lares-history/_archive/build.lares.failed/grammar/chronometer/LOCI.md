<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///grammar.chronometer.defines/chronometer/?confidence=S~13&p=10 -->

# Grammar: FFZ Chronometer

```yaml
---
name: chronometer
description: >
  The Fontany-Fuller-Zelenka chronometer. This locus defines nested
  loop-time position per participant through five scale slots, each
  carrying a ooda-ha phase marker plus counter.
phase-map:
  observe: "#loop-position"
  orient: "#handoff"
  decide: "#conventions"
  act: "#procedures"
  assess: "#reading-test"
trigger: always — grammar primitive
invariant: true
dependencies: [uri, ooda-ha]
confidence:S~13
grammar: true
---
```

> **Register:** `[S~13]` — operationally grounded, still open to deeper refinement
> **Question:** Where does this participant stand in nested causal time?

---

<!-- ahu lar:///grammar.chronometer.defines/chronometer/?confidence=S~13#loop-position -->

## Loop Position

The chronometer shapes the WHEN layer of the grammar. It does not choose the phase. It records the
phase and counter at each active scale.

Chronometer receives:

- participant loop position
- active scale state
- counter state
- scale-shift outcomes

Chronometer changes:

- vague timing into nested timing
- one flat clock into participant-scoped causal position
- silent scale transitions into visible scale transitions

Chronometer hands forward:

- fragment strings
- scale visibility
- phase/counter continuity

Chronometer should not:

- pretend one shared god-clock covers both participants
- drop inactive slots from the fragment
- hide scale transitions that matter to later readers

---

<!-- ahu #handoff -->

## Handoff

The chronometer handoff moves through five always-present slots:

| Scale | HUD Sigil | Record Shape |
|---|---|---|
| Week | `🗺️` | leftmost slot |
| Watch | `⚙️` | second slot |
| Turn | `🔍` | third slot |
| Round | `⚔️` | fourth slot |
| Action | `⚡` | fifth slot |

Each slot carries `phase + counter`, for example:

```text
#O0.O0.O3.D2.A7
```

The handoff should let a later reader answer:

1. Which scale currently carries live motion?
2. Which phase sits active at that scale?
3. Which counter marks the current position?
4. Did the span advance or merely shift phase?

---

<!-- ahu lar:///grammar.chronometer.defines/chronometer/?confidence=S~13#surface -->

## Composable Surface

| Phase | HUD | Record |
|---|---|---|
| Observe | `✶` | `O` |
| Orient | `◎` | `Ø` |
| Decide | `◇` | `D` |
| Act | `■` | `A` |
| Assess | `○` | `Å` |

**Surface rule:** all five positions stay present, even when a scale lies dormant. Dormant scales keep
their zeroed slot instead of disappearing.

That surface should remain reusable across:

- exchange URIs
- crystal metadata
- compiled HUD render targets
- later scale-shift analysis

---

<!-- ahu lar:///grammar.chronometer.defines/chronometer/?confidence=S~13#conventions -->

## Conventions

| Rule | Weight | Rationale |
|---|---|---|
| Keep all five scale positions present | MUST | Fixed structure simplifies reading and validation |
| Track phase per participant, not as one shared clock | MUST | Fuller pressure against false simultaneity carries the load |
| Increment counters on completed aftermath at the relevant scale | SHOULD | Counter movement should follow cycle completion |
| Allow phase changes without counter changes | MUST | Intra-cycle motion should stay visible |
| Keep chronometer work in the fragment only | MUST | Time should stay in one structural slot |

---

<!-- ahu lar:///grammar.chronometer.defines/chronometer/?confidence=S~13#procedures -->

## Procedures

1. Identify the active scale.
2. Identify the active phase at that scale.
3. Carry the current counters across all five slots.
4. Update only the slots that genuinely changed.
5. Emit the fragment in fixed five-slot order.

**Failure mode:** timeline theater. Decorative counters that do not correspond to actual loop movement
add mystique and subtract signal.

---

<!-- ahu lar:///grammar.chronometer.defines/chronometer/?confidence=S~13#reading-test -->

## Reading Test

A chronometer fragment passes when a future reader can recover all of this:

- active scale
- active phase
- current counter
- dormant surrounding scales

If the fragment cannot support dead-reckoning by a later reader, the time layer still needs work.

---

## Cross-References

- [ooda-ha/LOCI.md](../ooda-ha/LOCI.md)
- [exchange/LOCI.md](../exchange/LOCI.md)
- [uri/LOCI.md](../uri/LOCI.md)
- [../../modules/uri-schema/URI_SCHEMA.md](../../modules/uri-schema/URI_SCHEMA.md)

---

## Loci Registry

| Path | Status | Contents |
|---|---|---|
| `LOCI.md` | `[S~13]` | This file — FFZ chronometer grammar and fragment contract |

*Future loci in this tree will land here.*

---

<!-- → ? -->
