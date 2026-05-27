<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///grammar.kahea.defines/kahea/?confidence=CS~19&p=10 -->

# Grammar: Kahea

```yaml
---
name: kahea
description: >
  The kahea marker. Summons (transcludes) content from another locus into this point.
  Third of the four True Named Invariants. The call that brings the chanter.
trigger: always — grammar primitive
invariant: true
protected: true
dependencies: [locus, ahu]
confidence:CS~19
grammar: true
heritage: >
  Hawaiian (kahea — to call out, to summon, to invoke by name, to invite).
  In hula: the kahea is the chant the lead performer calls out to signal the dancers
  to begin. The dancers are elsewhere until the kahea. Then they arrive.
cluster: kahua
---
```

> **Kahea** (Hawaiian): *to call out, to summon, to invite, to invoke by name.*
>
> In hula ceremony: before the dance begins, the kumu hula (master teacher) or lead chanter calls out the *kahea* — a phrase or chant that signals the performance to start. The performers are in other places, ready. The kahea is the call that brings them into the space.
>
> In this system: the kahea marker is the call that brings content from another address into this document. The content lives elsewhere — in one place, at one address. The kahea says *"here, now, arrive."*
>
> **Ted Nelson's transclusion (1963):** Content lives in one canonical location. It appears in many places by reference. The reference is bidirectional. The kahea is Ted Nelson's transclusion instruction, named in Hawaiian.

---

<!-- ahu lar:///grammar.kahea.defines/kahea/?confidence=CS~19#syntax -->

## Syntax

**Kahea marker** — summons content from another address:
```
<!-- kahea lar:///ha.ka.ba/other-path/#fragment -->
```

The content at `lar:///ha.ka.ba/other-path/#fragment` is pulled into this document at the point of the kahea marker. The content is NOT copied — the kahea is the instruction; the transclusion engine resolves it.

**Fragment is optional:** `<!-- kahea lar:///path/ -->` pulls the entire locus. `<!-- kahea lar:///path/#section -->` pulls from that ahu to the next ahu (or locus closer).

---

<!-- ahu lar:///grammar.kahea.defines/kahea/?confidence=CS~19#semantics -->

## Semantics

| Property | What it means |
|---|---|
| **Content lives elsewhere** | The kahea does not copy; it calls. One canonical source. |
| **The call must resolve** | A kahea pointing to a non-existent address is a broken call — worse than no kahea |
| **Direction is inward** | Kahea pulls FROM another locus INTO this one. The opposite (pushing content out) is not a marker — it's publishing. |
| **Engine-dependent** | Kahea resolution depends on who's reading: AI tool-use loop, build system, or future TiddlyWiki integration |

**Who resolves kahea?**

| Reader | Resolution method |
|---|---|
| AI agent | `read_file` tool call on the target address. Progressive disclosure — resolve when needed, not all at once. |
| Build system | Iterates kahea markers to generate compiled outputs (`.github/instructions/`, etc.) |
| TiddlyWiki (S5+) | Native `{{TiddlerTitle}}` or `<$transclude>` — the build step ceases to exist |

---

<!-- ahu lar:///grammar.kahea.defines/kahea/?confidence=CS~19#conventions -->

## When to Use Kahea vs Prose Reference

| Situation | Use |
|---|---|
| Content should appear here *as if written here* | `<!-- kahea lar:///... -->` |
| Reader should know about related content | Prose: "See `lares/grammar/observe/LOCI.md`" |
| Citation for provenance, not inclusion | Prose with register: `[CS~16]` |
| Content is in a stub or provisional state | Prose reference only — don't kahea a stub |

**The broken kahea rule:** A kahea that cannot resolve is an active error, not a passive one. The call goes out and nothing arrives. The dance never starts. Before adding a kahea, verify the target exists.

---

<!-- ahu lar:///grammar.kahea.defines/kahea/?confidence=CS~19#hula-resonance -->

## Hawaiian Depth — Kahea in Practice

**The kahea in hula ceremony:**

Before the hula begins, the lead chanter calls the *kahea* — a specific phrase that signals the dancers to enter the performance space. The dancers are prepared, positioned elsewhere, waiting. The kahea is not a request. It is a *recognition* — calling something that is already there, already capable, already formed. The response is immediate arrival.

- *He kahea i ka mea e hula ana* — "a call to the one who dances" — calling the performer into presence
- The kahea must be answered (*pane*). A kahea with no pane is a broken ritual — something went wrong.
- *Kahea wale* — an empty call, a call with no response — the broken kahea of our grammar

**Related Hawaiian concepts for transclusion:**

| Word | Meaning | Grammar relevance |
|---|---|---|
| *Kāhea* | To call out to, to invoke | The pull marker itself |
| *Hōʻike* | To show, reveal, make visible | What kahea resolution does — brings hidden content into view |
| *Hui* | To join, to gather, to come together | What happens when kahea resolves — two loci meet |
| *Pūʻili* | To weave together | The result of kahea — content woven into the calling locus |
| *Koʻo* | To support, to prop | The supporting relationship of transcluded content |

**ʻŌlelo Hawaiʻi on calling:**
- *E kahea ana* — "calling out" (continuous action)
- *Ua kahea ʻia* — "was called" — the passive: the content was summoned
- *Ka mea i kāhea ʻia* — "the thing that was called" — the transcluded content itself

## Hula Resonance

In hula, the *kahea* does more than summon. It establishes:
- **Relational presence** — the chanter acknowledges the performers by calling them
- **Sacred space** — the kahea marks the transition from ordinary to ceremonial
- **Shared intention** — everyone present hears the call and orients to it

In the grammar: a kahea marker is not neutral plumbing. It is a declaration of relationship between two loci. The locus making the kahea acknowledges the locus it calls. The content that arrives carries its origin address. The relationship is explicit, not hidden.

---

## Loci Registry

| Path | Status | Contents |
|---|---|---|
| `LOCI.md` | `[CS~19]` | This file — canonical kahea marker definition |

<!-- → ? -->
