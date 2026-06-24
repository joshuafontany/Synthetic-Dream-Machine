<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ≋&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/lararium-memory >>
```toml iam
cacheable = true
file-path = "bags/@lares/ha.ka.ba/@lares/v0.1/api/pono/lararium-memory.md"
hydrate   = true
mana      = 16
manao     = 16
manaoio   = 14
namespace = "≋"
register  = "Synthesis-Canon"
retain    = true
role      = "the memory model stated whole — three surfaces (chat-stream · Lararium · MemPalace), two organs (cortex · hippocampus), one lar: namespace; the GroundedVow binding, the two drains, and the capture-before-wire law that hands turn-decomposition to the TW5 memetic-wikitext VM via the @admin wiki-island"
tags      = ["api/pono/meme", "api/pono/causal-islands", "api/pono/local-first", "api/pono/loci"]
l-space   = "stable"
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lares/v0.1/api/pono/lararium-memory"
written   = "2026-06-23"
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ &#x0002; >>

<<~ ahu #head >>

# Lararium Memory ~ three surfaces, two organs, one namespace

The node carries memory across **three surfaces**, each running at its own
timescale and federation boundary. Stated whole, so the model stops living
scattered across five memes:

> **The chat-stream drains two ways — verbatim into MemPalace, authored into the
> Lararium — and the cortex consults the hippocampus by GroundedVow, never the
> reverse.**

The three surfaces braid into **two organs** sharing **one `lar:` namespace**.
The surfaces name *where* memory lives; the organs name *what kind* of memory
each holds; the namespace keeps them addressable from one bearing.

<<~/ahu >>

<<~ ahu #three-surfaces >>

## The Three Surfaces

\procedure ~Surface(~Type:"" ~Params:"") ~Surface <<~Type>> <<~holds `[<~Params>]`>>

<<~Surface Chat-Stream "metaphor/RAM role/ephemeral-working-state grain/the-turn federates/no ~ each turn runs a causal island, no shared now across the turn boundary; the source that drains two ways" >>
<<~Surface Lararium "metaphor/cortex role/semantic-standing-meaning grain/session→permanent federates/yes@≥meme ~ writable through the @working→canon shore; the wiki-quine-relay carries it across the mesh" >>
<<~Surface MemPalace "metaphor/hippocampus role/verbatim-episodic-testimony grain/permanent-local federates/never ~ append-only, structurally outside the CRDT Repo; the bearing-index rides over it as a lossy projection" >>
<<~Surface Three >>

**The chat-stream** holds what the turn works with — operator intent, the role
adopted, the live exchange. It empties at the turn boundary (`ooda-ha`); the node
reads only its own log, never a global now.

**The Lararium** holds what the node *means* — authored memes, rulings, the
standing graph. It writes live to `@working`, projects to `wikis/{slug}`, and
crosses to canon (`@{slug}`) only through a cap-gated `MOVE` (the shore, below).

**MemPalace** holds what the node *said* — verbatim drawers, episodic, local. It
never enters an Automerge doc, so it stays structurally unfederatable by design,
not by policy.

<<~/ahu >>

<<~ ahu #two-organs >>

## Two Organs ~ the GroundedVow binding

The Lararium and MemPalace serve genuinely different offices — **standing meaning
and episodic testimony, cortex and hippocampus — mutually referential, never
sequential.**

<<~moves grounding -> consult on/the-witness do/anchor-a-claim never/feed-into-canon >>

- The **cortex consults the hippocampus** to ground a claim ~ *"what did we
  actually say at this bearing?"*
- The **witness never flows into the cortex.** No drawer promotes to canon. The
  bearing a turn spoke serves as **grounds the operator weighs** while authoring
  — never as material that crosses the shore on its own.

<<~ confidence Canon 17/20 >> The two-organ law settles canon (operator ruling,
2026-06-21; `loulou` the adapters meme below). GroundedVow names a **grounding
relation**, never a pipeline — the registers stay distinct even as they share the
one `lar:` namespace.

<<~/ahu >>

<<~ ahu #two-drains >>

## The Two Drains ~ how the chat-stream empties

The chat-stream, the RAM surface, drains in **two independent directions** at the
turn's close. Neither drain feeds the other:

\procedure ~Drain(~Type:"" ~Params:"") ~Drain <<~Type>> <<~holds `[<~Params>]`>>

<<~Drain Verbatim "into/MemPalace as/episodic-drawer grain/turn ground/byte-stable ~ the full turn lands as testimony; the bearing-harvest reads aim→yield over it" >>
<<~Drain Authored "into/Lararium as/standing-meme path/@working→MOVE→canon ~ the operator authors meaning, crossing the shore by a witnessed residency verb" >>
<<~Drain Two >>

The **working↔canon shore** governs the authored drain: a `@working` edit shadows
canon via the recipe cascade; the crossing to `@{slug}` rides a cap-gated `MOVE`
that writes an effect-record and shows on disk as a `git` diff (the residency
ACTION verb names the crossing — never a VCS verb). The verbatim drain needs no
shore: it appends and never normalizes.

<<~/ahu >>

<<~ ahu #capture-before-wire >>

## Capture Before Wire ~ the turn-grammar rides the VM

Every turn emits a rich **provisional-gradient-grammar** — confidence band, lar:
bearing, Voice, OODA-HA phase, ward state, oracle marks, Aperture, Syad stance,
rating ladder. Today the **lar: bearing alone** lands structured (the
`bearing-harvest` parser → `BearingRecord`); the **other channels render as prose
and dissolve uncaptured**.

So the metadata cannot wire into MemPalace yet — **it stays rendered, then lost.**
The capture must precede the wiring.

**The decomposition rides the engine that already parses the grammar.** The hook
hands the whole turn to the Lararium; the **@admin wiki-island decomposes it
through the TW5 memetic-wikitext VM** and hands the structured metadata back. The
node never hand-rolls a second parser racing ahead of the VM — it uses the
machinery that already reads the sigils.

<<~ confidence Provisional-Synthesis 7/20 >> **PROPOSED, awaiting the full TW5
memetic-wikitext integration** (operator ruling, 2026-06-23): the exact
turn-metadata record shape stays unset until the hook→Lararium→@admin→decompose→
hand-back path stands. The `bearing-harvest` carries the pattern to extend
(graceful degradation · verbatim · drift preserved as the keeper's gauge), not the
site to build at.

<<~/ahu >>

<<~ ahu #register-dressed >>

## Register-Dressed, Never Gated

A captured channel carries its **confidence as a forward Play→Committed gradient**
— a stance the turn vowed, never a how-true-is-it grade stamped after. So recall
**dresses** a memory in its register; it never **gates** by it.

<<~ranks recall provisional@1..4 ~ a live re-openable thread (play) -> synthesis@9..12 ~ working ground -> canon@17..20 ~ weight-bearing >>

- A `provisional@3` drawer surfaces **as play** — an invitation to re-open, not
  noise to suppress. Low reads fertile.
- A `canon@18` drawer surfaces **as committed** — weight-bearing.
- The band shapes the **posture** toward a memory, never whether it surfaces.
  Recall drops nothing for sitting low and normalizes nothing at the floor; drift
  stays the keeper's gauge.

A play-drawer disagreeing with a committed-drawer reads as **expected** (Plurality
Pono), not a contradiction to resolve by ranking. Only two *committed* claims in
conflict press a `hoike`.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lararium_mcp/adapters >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/pono/wiki-layer-ontology >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/causal-islands >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/local-first >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/lares/noosphere-boot#causal-islands >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
