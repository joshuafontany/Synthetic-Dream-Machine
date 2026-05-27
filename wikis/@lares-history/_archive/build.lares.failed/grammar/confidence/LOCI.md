<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///grammar.confidence.defines/confidence/?confidence=CS~16&p=10 -->

# Grammar: Confidence + Register Bands

```yaml
---
name: confidence
description: >
  The register band system from Canon to Provisional. Confidence tracks
  declared claim weight through the active stance.
phase-map:
  observe: "#loop-position"
  orient: "#handoff"
  decide: "#conventions"
  act: "#procedures"
  assess: "#reading-test"
trigger: always — grammar primitive
invariant: true
dependencies: [stance]
confidence:CS~16
grammar: true
---
```

> **Register:** `[CS~16]` — grounded in live HUD practice and operator agency rules
> **Question:** How much weight should this claim carry inside its active stance frame?

---

<!-- ahu lar:///grammar.confidence.defines/confidence/?confidence=CS~16#loop-position -->

## Loop Position

Confidence shapes the HOW layer beside stance. It does not choose the evaluation frame. It declares
how settled the claim reads within that frame.

Confidence receives:

- claim shape
- evidence quality
- source chain quality
- stance frame

Confidence changes:

- hidden certainty into declared certainty
- flat assertion into weighted assertion
- promotion pressure into explicit review thresholds

Confidence hands forward:

- banded register tags
- promotion or demotion cues
- section-level settlement markers

Confidence should not:

- masquerade as universal truth-weight
- outrun the evidence chain
- silently promote itself into Canon

---

<!-- ahu lar:///grammar.confidence.defines/confidence/?confidence=CS~16#handoff -->

## Handoff

Confidence hands directly into decision, registry, and citation behavior.

The handoff should let a later reader answer:

1. Which band does this claim carry?
2. What does that band mean in the active stance?
3. What would justify promotion or demotion?
4. Does operator agency matter for the next threshold?

If those answers stay vague, the tag becomes decoration instead of signal.

---

<!-- ahu lar:///grammar.confidence.defines/confidence/?confidence=CS~16#surface -->

## Composable Surface

| Tag | Zone | Range |
|---|---|---|
| `[C~18]` | Canon | 0.85–0.95 |
| `[CS~16]` | Canon / Synthesis | 0.75–0.85 |
| `[S~13]` | Synthesis | 0.50–0.75 |
| `[SP~9]` | Synthesis / Provisional | 0.35–0.50 |
| `[P~6]` | Provisional | 0.20–0.35 |

**Section surface:** confidence can sit at file level, section level, or claim level, as long as the
placement stays explicit and the source of the weight stays legible.

---

<!-- ahu lar:///grammar.confidence.defines/confidence/?confidence=CS~16#conventions -->

## Conventions

| Rule | Weight | Rationale |
|---|---|---|
| Read the band through stance | MUST | Same number measures different things in different frames |
| Match the band to the evidence chain | MUST | Weight should stay earned |
| Keep promotion and demotion explicit | SHOULD | Quiet drift harms trust |
| Require operator agency for Canon promotion | MUST | Canon should not self-appoint |
| Keep local confidence attachable at the `ahu` level | SHOULD | Settlement can vary within one locus |

**Promotion rule:** stronger evidence, clearer source chain, and operator confirmation carry
claims upward into Canon bands.

**Demotion rule:** contradiction, thin sourcing, or frame mismatch should pull the weight downward.

---

<!-- ahu lar:///grammar.confidence.defines/confidence/?confidence=CS~16#procedures -->

## Procedures

1. Identify the active stance.
2. Judge the evidence chain inside that frame.
3. Select the narrowest honest band.
4. Mark the band where the claim lives.
5. Reassess when new evidence or contradiction arrives.

**Failure mode:** ornamental confidence. A tag without a readable evidence basis adds noise instead of
clarity.

---

<!-- ahu lar:///grammar.confidence.defines/confidence/?confidence=CS~16#reading-test -->

## Reading Test

A confidence span passes when a future reader can recover all of this:

- the declared band
- the stance frame that gives the band meaning
- the evidence basis for the tag
- the threshold for promotion or demotion

If the band could move wildly without changing the supporting reasons, the tag still lacks discipline.

---

## Cross-References

- [stance/LOCI.md](../stance/LOCI.md)
- [e-prime/LOCI.md](../e-prime/LOCI.md)
- [../../../lares/ha-ka-ba/docs/mu/the-syad-perspectives/SYADASTI_READING_RULE.md](../../../lares/ha-ka-ba/docs/mu/the-syad-perspectives/SYADASTI_READING_RULE.md)
- [../../modules/uri-schema/URI_SCHEMA.md](../../modules/uri-schema/URI_SCHEMA.md)

---

## Loci Registry

| Path | Status | Contents |
|---|---|---|
| `LOCI.md` | `[CS~16]` | This file — confidence grammar and register bands |

*Future loci in this tree will land here.*

---

<!-- → ? -->
