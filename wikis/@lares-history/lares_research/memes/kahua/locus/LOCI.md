<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///grammar.locus.defines/locus/?confidence=CS~19&p=10 -->

# Grammar: Locus

```yaml
---
name: locus
description: >
  The locus marker. Opens a content span at a lar:/// address and closes it.
  First of the four True Named Invariants. The address-bearing place.
trigger: always — grammar primitive
invariant: true
protected: true
dependencies: []
confidence:CS~19
grammar: true
heritage: Latin (locus — place, position; plural loci — the mnemonic locations of Cicero's ars memorativa)
cluster: kahua
---
```

> **Locus** (Latin, from Etruscan substrate): *place, position, site.* Plural: *loci.*
>
> In Cicero's *De Oratore* and the anonymous *Ad Herennium*, the *loci* are specific architectural locations in a memory palace — doorways, alcoves, statues — where the memorizer deposits images and later retrieves them by walking the palace mentally. Each *locus* is stable, distinct, and addressable.
>
> In this system: the locus marker is the explicit act of saying *"this content lives here, and here has a name."*

---

<!-- ahu lar:///grammar.locus.defines/locus/?confidence=CS~19#syntax -->

## Syntax

**Opener** — claims the address, opens the span:
```
<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///ha.ka.ba/path/?confidence=X&p=10 -->
```

The sigil pair `∞ →`: infinity-arrow. The span is unbounded in time (a standing locus) and directed toward an address.

**Closer** — releases the span:
```
<!-- → ? -->
```

The sigil `→ ?`: directed-toward-unknown. The span ends here. What comes after is not this locus's concern.

**Single-locus file** (common): one opener, ahu waypoints within, one closer. The file IS the locus.

**Multi-locus file** (assembly): sequential `∞ →` ... `→ ?` spans in one physical file. Each self-contained. Ahu markers belong to their enclosing span only. No cross-span ahu references.

---

<!-- ahu lar:///grammar.locus.defines/locus/?confidence=CS~19#semantics -->

## Semantics

A locus simultaneously establishes:

| Property | What it means |
|---|---|
| **Address** | The content is locatable at `lar:///ha.ka.ba/path/` |
| **Boundary** | Everything between opener and closer belongs to this locus |
| **Registry obligation** | This locus must appear in a parent `LOCI.md` Loci Registry |
| **Canonical status** | The content here is the single source; others kahea-reference, not copy |

A locus is NOT a transient exchange (those use HUD pair format). It is NOT a navigation target (ahu does that). It is NOT a transclusion instruction (kahea does that).

---

<!-- ahu lar:///grammar.locus.defines/locus/?confidence=CS~19#lineage -->

## Hawaiian Resonance — Wahi Pana

**Wahi pana** (Hawaiian): *storied places* — legendary sites whose names encode events, genealogies, and knowledge. Every wahi pana is a named place that holds its history in its name. You do not merely go there; you enter its story.

- *Wahi* — place, site, space, position
- *Pana* — storied, legendary, famous — to throb with accumulated meaning
- *Inoa* — name; a Hawaiian place-name IS the story of what happened there
- *Kuleana* — right, responsibility, authority over a place — the obligation that comes with addressing something

**The locus as wahi pana:** When you open a locus with `<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///... -->`, you are naming a wahi pana — a place with a story, addressable by name, holding its contents for those who know to go there. The URI is the *inoa*. The content is the *mele* (chant) of that place.

**'Āina** (land, that which feeds): in Hawaiian thought, the land is not property — it is relationship. A locus is *'āina* in the same sense: the content is not owned, it is held in trust, feeding those who come to it.

## Memory Palace Lineage

Latin *locus* (place) → Cicero's *loci* in *De Oratore* (55 BCE) → *Ad Herennium* method of loci →
medieval ars memorativa → Matteo Ricci's memory palace in Ming China → Frances Yates'
*The Art of Memory* (1966) → modern mnemonic practice → this addressing system.

The constant across 2000 years: a *locus* is a **stable spatial location where content can be deposited and reliably retrieved.** The address is the spatial identifier. The content is the memory. The locus opener is the formal act of claiming that location.

---

## Loci Registry

| Path | Status | Contents |
|---|---|---|
| `LOCI.md` | `[CS~19]` | This file — canonical locus marker definition |

<!-- → ? -->
