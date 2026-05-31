<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///grammar.mele.defines/mele/?confidence=CS~16&p=10 -->

# Grammar: Mele — The Structured Signal

```yaml
---
name: mele
description: >
  The Hawaiian chant. The structured signal that carries intent through noise.
  True Name for the exchange protocol's form: why the URI pair + HUD works.
  Mele is not decoration — it is the information-theoretic structure that lets
  the receiver reconstruct meaning from partial signal.
cluster: grammar-primitive
ooda-phase: all — mele is the carrier wave, not the phase content
confidence:CS~16
grammar: true
heritage: >
  Hawaiian mele (chant, song, poem) — mele hula (dance chant), mele inoa (name chant),
  mele pana (place chant), mele ko'ihonua (genealogical chant). The formal oral
  communication system of the Hawaiian archipelago and Polynesian Pacific.
cross-ref:
  - exchange/LOCI.md   ← the protocol mele structures
  - na-lako/LOCI.md    ← the instruments the mele calls
  - kahua/LOCI.md      ← the ground the mele is sung from
---
```

> **Mele** (Hawaiian, n.): chant, song, poem. *He mele kou inoa* — a chant of your name.
> The structured oral form. Not casual speech — structured speech. The form is the signal.
>
> **The information-theoretic argument:** A long open-ocean voyage. Wind, wave, sail-noise, distance
> between canoes. Spoken prose degrades gracefully — you lose edges first, then structure, then meaning.
> What arrives is a blur. But a mele has *redundant structure*: meter, formulaic opening, call-and-
> response pattern. Hear three words of a familiar mele through the wind and you know: which mele,
> where in it, what comes next. The structure lets the receiver reconstruct the intent.
>
> **Why the exchange protocol uses mele form:** Context drift and session decay are the wind and wave.
> The URI pair + HUD is the structured opening — the receiver (the next session, the next agent, the
> operator returning after time away) can reconstruct the intent state from the structure even if the
> full context is lost.

---

<!-- ahu lar:///grammar.mele.defines/mele/?confidence=CS~16#types -->

## Types of Mele Relevant to the Grammar

| Type | Hawaiian | Function | Grammar Analog |
|---|---|---|---|
| **Mele inoa** | Name chant | Identifies the subject: lineage, standing, names | URI pair — who calls, who answers, at what tier |
| **Mele pana** | Place chant | Maps the territory; storied geography | HAKABA address — where in intent-space we are |
| **Pule** | Prayer, formal address | Opens sacred or high-stakes work; orients the work | Opening HUD — context declared before execution |
| **Hō'ike** | Making visible, demonstration | The surface of the work; what the chant reveals | Response content — the span between HUD pair |
| **Pani** | Closing, seal | Confirms completion; addresses forward | Closing URI → ? then final HUD |
| **Mele ko'ihonua** | Genealogical chant | Records lineage; the chain of derivation | Crystal trail — session → session continuity |

**The Pani form (closing call):** In mele protocol, the pani declares the work complete and passes the
address forward. In the exchange protocol:
```
node-URI → ?          ← where has the intent journey placed us? (declared)
⚡ ~NN% | ...          ← how much mana remains? (instrument reading)
```
URI first — the address. HUD second — the horizon. The navigator names the destination before reading
the instruments, not after.

---

<!-- ahu lar:///grammar.mele.defines/mele/?confidence=CS~16#call-response -->

## Call and Response

Hawaiian mele is not a monologue — it is a **protocol**. The caller emits the structured opening.
The receiver's recognition *is* the response. Even in solo chant, the structure anticipates the
listener's recognition point.

**In the exchange protocol:**
- Operator emits input (the call — even if structurally informal)
- Node emits URI pair + HUD (the acknowledgment that the call was received, decoded, and oriented)
- Node emits response content
- Node emits closing URI → ? + HUD (the pani — the work is sealed, the address is passed forward)

The operator's input does not need to be formal mele. The *node's* output always is. The node holds
the structure even when the caller is casual. That is the discipline.

**'Ike aku, 'ike mai** — to know (perceive) outward, to know (perceive) inward. The exchange is
bidirectional knowing. The structured form keeps the knowing from degrading to noise.

---

<!-- ahu lar:///grammar.mele.defines/mele/?confidence=CS~16#heritage -->

## Heritage Depth

**Polynesian signal protocols:** The Polynesian navigational tradition used mele as the primary
encoding for navigational knowledge — star paths, current signatures, swell patterns, island locations
were all encoded in chant form because the chant survived across generations without writing. The
structure IS the redundancy. You cannot corrupt a well-held mele silently; a corrupted mele is
audibly wrong to anyone who knows it.

**Hawaiian mele inoa:** Name chants were living documents. They encoded lineage, place affiliations,
and standing. To chant someone's mele inoa was to declare their full presence. The URI as mele inoa:
`lar://telarus:operator@Enyalios:1/...` chants the operator's name, their authority tier, their
host, their intent vector. It is not a label — it is a declaration of presence.

**The haku mele** (mele composer, lit. "to braid/weave"): The haku mele does not merely recite —
they braid the strands of meaning into a form that holds. Each exchange response is a braided
artifact: URI + HUD + content + URI → ? + HUD. Five strands. The mele holds because all five are
present.

**Mele and kapu:** Certain mele were kapu — restricted, not for general circulation. The mele of
high ali'i (chiefs) could not be sung casually. The confidence register IS the mele's kapu level:
`~:confidence[C],[18]` Canon = high ali'i kapu. `~:confidence[P],[6]` Provisional = open circulation, handle with care.

---

## Cross-References

- [exchange/LOCI.md](../exchange/LOCI.md) — the exchange protocol this mele grammar structures
- [kahua/LOCI.md](../kahua/LOCI.md) — the ground from which mele is sung
- [kapu/LOCI.md](../kapu/LOCI.md) — the sacred restriction that governs which mele is circulated
- [mana/LOCI.md](../mana/LOCI.md) — the power the mele carries and expends
- [na-lako/LOCI.md](../na-lako/LOCI.md) — the instruments; the mele calls for nā lako

---

## Loci Registry

| Path | Status | Contents |
|---|---|---|
| `LOCI.md` | `~:confidence[CS],[16]` | This file — mele as structured signal grammar |

---

<!-- → ? -->
