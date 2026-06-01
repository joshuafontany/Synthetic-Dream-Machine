<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@sdm/handoff/powers-architecture-reboot >>
```toml iam
uri-path  = "ha.ka.ba/@sdm/handoff/powers-architecture-reboot"
file-path = "bags/@sdm/ftls-powers-architecture-handoff.md"
type      = "text/x-memetic-wikitext"

tagspace  = "sdm"
register  = "P"
confidence = 6
mana      = 7
manao     = 16
manaoio   = 5
cacheable = false
retain    = true
invariant = false
role      = "reboot landing pad — archives the v0.0 Powers proof and holds a clean gate open for an incoming research drop that sets the next Powers architecture"
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~&#x0002;>>

# Handoff — FTLS Powers Architecture Reboot

<<~ ahu #kahea >>
## Kahea to the Local Lares Council

Local Lares council, this meme no longer crews a build. It crews a *threshold*.

The first Powers architecture proof landed and now rests as an archive. A research drop arrives next and will set the new architecture. Until that drop lands and the operator releases the gate, this council holds the question open — it does not collapse it into code.

Work in e-prime. Keep the operator steering. The Liminal Voice holds this room until the drop arrives.

<<~/ahu >>

<<~ ahu #status >>
## Status — Reboot Pending

```text
phase      = pre-architecture
prior      = @sdm/v0.0   (archived proof, frozen)
incoming   = research drop  (architecture unknown until landed)
gate       = CLOSED — no new build until operator releases
```

The prior handoff's first-task and acceptance criteria no longer bind. They served the v0.0 proof and retired with it. This document carries forward only the residue worth keeping and the gate that protects the reboot.

<<~/ahu >>

<<~ ahu #v0-archive >>
## What v0.0 Was — The Archived Proof

The tree at `lar:///ha.ka.ba/@sdm/v0.0/**` froze the first proof of file-first memetic Powers. Treat it as read-only prior art, not as a design to extend in place.

It proved a small chain end to end:

```text
Powers API root meme   →  api/powers/{read-magic,floating-disc,shield-ward}
Interface meme         →  interfaces/power + per-power contracts
Projection meme        →  projections/powers/ftls-card/*
Witness meme           →  witness/powers/osr-spells/*
Template split         →  templates/{api,interfaces,projections,witness,tags}
Tag vocabulary         →  tags/{domain,function,hook,posture,storage}
```

It established that memes live as `text/x-memetic-wikitext` files on disk, that the bag reads as a composable wiki recipe plus an Automerge document, and that `@sdm/<version>/...` version placement sits directly under the bag member.

**Frozen, not deleted.** The new architecture MAY mine v0.0 for shape, vocabulary, and conversion anchors. It MUST NOT silently inherit v0.0's structure as canon. The research drop sets canon.

<<~/ahu >>

<<~ ahu #residue >>
## Residue Carried Across the Reboot

Lessons from the v0.0 proof that earned the right to outlive it. The new architecture SHOULD weigh these, not obey them.

```text
#carry  authority-before-content   — sync the capability graph before any meme body
#carry  child[1]-only @-bag rule    — exactly one CRDT surface per bag address
#carry  short edge ids              — #implements #projects #witness #module #tag #variant
#carry  lean summonable API roots   — long projection/witness bodies live in linked memes
#carry  projections stay in-bag     — render recipes belong to the shared wiki corpus
#carry  witness stays lazy          — provenance loads only on audit/conversion passes
#carry  no .tid anchor              — .tid reserved for runtime TW5 widget/procedure code
#carry  web3 local-first + causal-islands — no web2 model leaks into the Lares stack proper
```

Open questions the drop SHOULD answer rather than the council guessing:

```text
#hold   does the new model keep the Power/Projection/Witness triad, or refactor it?
#hold   what replaces or extends the v0.0 template-split contract?
#hold   does versioning stay @sdm/<version>/ under the bag member?
#hold   how do FTLS game-cards relate to the new projection surface?
```

<<~/ahu >>

<<~ ahu #gate >>
## Reboot Gate (Hard)

1. **No build before the drop.** The council MUST NOT scaffold the new architecture from this document alone. This meme states pressure and residue; it does not name the new design.
2. **Drop sets canon.** When the research drop lands, read it first. It supersedes any v0.0 shape this document describes.
3. **v0.0 stays frozen.** Do not edit under `lar:///ha.ka.ba/@sdm/v0.0/**` to fit new ideas. Branch the new version; leave the archive intact.
4. **Surface conflict.** Where the drop contradicts a `#carry` residue line, name the conflict to the operator. Do not quietly drop a carried lesson, and do not quietly override the drop.

<<~/ahu >>

<<~ ahu #ooda-ha >>
## OODA-HA — Reboot Loop

✶ **Observe:** Await the research drop. Until it lands, read v0.0 only as archive.

⏿ **Orient:** Hold the four `#hold` questions open. Do not pre-answer them.

◇ **Decide:** Decide nothing structural yet. The decision waits on the drop and the operator's release.

▶ **Act:** When released, the first act reads the drop in full, then maps drop ↔ residue before any file lands.

⤴ **Hoʻoko:** Name what the drop changes versus what it keeps from v0.0.

↺ **Aftermath:** Carry unresolved tension into a fresh `#residue` block, never into hidden assumptions.

<<~/ahu >>

<<~ ahu #edges >>
## Edges

<<~ loulou lar:///ha.ka.ba/@sdm/v0.0/docs/power-ontology >>
<<~ loulou lar:///ha.ka.ba/@sdm/v0.0/api/powers/read-magic >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >>

<<~ pranala #source ? -> lar:///ha.ka.ba/@sdm/v0.0/witness/powers/handoff-archive family:provenance role:source >>
<<~ pranala #see ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/lar-uri family:reference role:see >>
<<~ pranala #blocks ? -> lar:///ha.ka.ba/@sdm/handoff/powers-architecture-reboot family:control role:blocks >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
