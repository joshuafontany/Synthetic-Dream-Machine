<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///grammar.ahu.defines/ahu/?confidence=CS~19&p=10 -->

# Grammar: Ahu

```yaml
---
name: ahu
description: >
  The ahu marker. Names a navigable waypoint within a locus span.
  Second of the four True Named Invariants. The stone you can see and walk to.
trigger: always — grammar primitive
invariant: true
protected: true
dependencies: [locus]
confidence:CS~19
grammar: true
heritage: >
  Hawaiian (ahu — cairn of stones, raised altar platform, stone waymarker on a trail).
  Polynesian (ahu — stone altar, sacred elevated platform across Pacific traditions).
  Rapanui (ahu — the stone ceremonial platforms of Easter Island, holding the moai).
cluster: kahua
---
```

> **Ahu** (Hawaiian / Polynesian): a raised platform or cairn of stones. Used as:
> — trail markers: small ahu of stacked stones mark safe passage across lava fields
> — sacred platforms: large ahu at heiau (temples) hold altars and offerings
> — navigation markers: coastal ahu orient voyagers approaching shore
> — memorial markers: ahu mark the sites of significant events
>
> The ahu is always **visible, named, and walkable-to.** It is placed where people already walk, not in places they never go.
>
> On Rapa Nui (Easter Island): the great *ahu* are the stone platforms that hold the moai — the ancestral figures looking inland, watching over the living. The ahu is not the moai. The ahu is what the moai stands on.

---

<!-- ahu lar:///grammar.ahu.defines/ahu/?confidence=CS~19#syntax -->

## Syntax

**Ahu marker** — names a waypoint, carries its own address + fragment:
```
<!-- ahu lar:///grammar.ahu.defines/ahu/?confidence=CS~19#fragment-name -->
```

The fragment (`#fragment-name`) is what external references navigate to. The ahu marker establishes both:
- **The stop itself** — a named point within the parent locus
- **The navigable address** — `lar:///...#fragment-name` is a complete address any kahea can pull from

**No opener/closer:** The ahu is a point marker, not a span. Its boundary is implicit: from this ahu to the next ahu (or to the locus closer) is "this ahu's zone."

---

<!-- ahu lar:///grammar.ahu.defines/ahu/?confidence=CS~19#semantics -->

## Semantics

| Property | What it means |
|---|---|
| **Named stop** | This location within the locus has a name and can be navigated to |
| **Fragment address** | External files can kahea-reference `#fragment-name` specifically |
| **Implicit zone** | Content from this ahu to the next defines what belongs to this waypoint |
| **Editorial placement** | Ahu are placed where readers actually need to navigate, not mechanically every N lines |

**The Polynesian navigation resonance:** A master Polynesian navigator (*pwo*) holds an internalized star compass — not a list of stars, but a felt sense of where each star rises and sets. The ahu waypoints in a LOCI.md are the navigator's internalized stops: known, named, trusted. You don't need to read the whole file. You navigate to the ahu you need.

---

<!-- ahu lar:///grammar.ahu.defines/ahu/?confidence=CS~19#placement -->

## Hawaiian Depth — Ahu Types

Not all ahu are the same. Hawaiian tradition distinguishes:

| Type | Description | Grammar analog |
|---|---|---|
| *Ahu pohaku* | Stacked stone cairn — trail marker, boundary marker | Section waypoint in a LOCI.md |
| *Ahu heiau* | Altar platform within a sacred complex — the innermost working surface | The high-confidence section (`[CS~18+]`) |
| *Ahu koʻa* | Fishing shrine — small coastal stone where fishermen offered before going out | Pre-sortie orientation point |
| *Ahu pā* | Boundary marker of a land division (*ahupuaʻa*) | The kapu line between loci |
| *Ahu a Māui* | "The cairn of Māui" — mythic stacked islands | The grammar root itself |

**Pōhaku** (stone): in Hawaiian thought, stones are not inert — *nā pōhaku* (the stones) are ancestors, witnesses, holders of *mana*. An ahu is not merely a marker; it is a site of accumulated mana. An ahu in a LOCI.md accumulates navigational trust — it is placed where many readers walk, and that traffic is itself a form of witness.

**Koʻa** (coral head, fishing shrine, navigational reference): the *koʻa* marked fishing grounds visible from shore. Navigators triangulated from *koʻa* to *koʻa*. An ahu in a LOCI.md is a *koʻa* — a known point from which you can take a bearing to other content.

**'Ike aku, 'ike mai** (to see and be seen): a Hawaiian navigational and relational principle. An ahu is placed where it can *be seen*. In the grammar: an ahu must be at a point that external references can resolve to. A hidden ahu is a broken marker.

## Placement Conventions

| Situation | Place ahu here? |
|---|---|
| Major section transition | Yes — this is a navigation stop |
| Content a reader might kahea-reference alone | Yes — give it its own ahu |
| Sub-section within a larger section | Maybe — only if it warrants independent navigation |
| Every paragraph | No — that is mechanical, not editorial |

The principle: **place stones where people walk.** A trail without markers is disorienting. A trail with markers every three steps is noise.

---

## Loci Registry

| Path | Status | Contents |
|---|---|---|
| `LOCI.md` | `[CS~19]` | This file — canonical ahu marker definition |

<!-- → ? -->
