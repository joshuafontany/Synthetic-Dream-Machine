<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@sdm/v0.1/witness/powers/handoff-archive >>
```toml iam
uri-path  = "ha.ka.ba/@sdm/v0.1/witness/powers/handoff-archive"
file-path = "bags/@sdm/v0.1/witness/powers/handoff-archive.md"
type      = "text/x-memetic-wikitext"

tagspace  = "sdm"
register  = "CS"
confidence = 15
mana      = 14
manao     = 16
manaoio   = 14
cacheable = false
retain    = true
invariant = false
role      = "witness: retired FTLS Powers memetic architecture handoff — design provenance and deferred scope for the @sdm Powers tree"
```

<<~&#x0002;>>

# Witness — Powers Architecture Handoff Archive

<<~ ahu #provenance >>
## Provenance

This meme archives the design handoff that launched the `@sdm` Powers meme tree. Original file: `bags/@sdm/ftls-powers-architecture-handoff.md`. Retired on branch `feature/lararium-node-4` after the First Task acceptance criteria passed.

The ontology root now lives at `lar:///ha.ka.ba/@sdm/v0.1/api/power`. The meme-set shape (api root → interface → projection → witness) now carries canon status in the template tree.

<<~/ahu >>

<<~ ahu #completed >>
## Completed — First Task Acceptance

All First Task items passed:

| File | Status |
|---|---|
| `bags/@sdm/v0.1/templates/api/power.md` | ✓ exists |
| `bags/@sdm/v0.1/templates/projections/powers/ftls-card.md` | ✓ exists |
| `bags/@sdm/v0.1/templates/witness/powers/osr-spells.md` | ✓ exists |
| `bags/@sdm/v0.1/api/powers/read-magic.md` | ✓ exists |
| `bags/@sdm/v0.1/projections/powers/ftls-card/read-magic.md` | ✓ exists |
| `bags/@sdm/v0.1/witness/powers/osr-spells/read-magic.md` | ✓ exists |

Floating Disc and Shield Ward followed read-magic as additional proofs (not in original First Task scope).

The ontology root `bags/@sdm/v0.1/api/power.md` landed post-handoff via session work. The ha.ka.ba activation address schema, storage taxonomy, and overcharge model now live there.

<<~/ahu >>

<<~ ahu #deferred-scope >>
## Deferred Scope — Not Yet Started

The handoff bag topology named these files as eventual targets. None started yet. Do not migrate until the Chapter 06 Powers chapter enters active conversion:

### Interface Memes

```text
bags/@sdm/v0.1/interfaces/powers/ecm-scan.md
bags/@sdm/v0.1/interfaces/powers/magic-decode.md
bags/@sdm/v0.1/interfaces/powers/archive-recognition.md
```

`ecm-scan` — electromagnetic countermeasure scan; contested archive/signal reading.
`magic-decode` — translation and extraction of spell-pattern encoding.
`archive-recognition` — pattern-match against a known archive lineage or rune-family.

Read Magic implements all three. They split when other Powers (or non-Power rites/items) need one primitive without the others.

### Module Memes

```text
bags/@sdm/v0.1/api/modules/knowledge-oracle.md
```

The knowledge-oracle module carries the doctrine cluster for Powers that query information across causal-island boundaries: recognition, decode, retrieval, and archive-handshake patterns. Read Magic belongs to it; future Powers (Comprehend Languages, Identify, Legend Lore analogues) will too.

### Tag Memes

```text
bags/@sdm/v0.1/api/tags/power.md
bags/@sdm/v0.1/api/tags/ecm-scan.md
bags/@sdm/v0.1/api/tags/storage-trait.md
bags/@sdm/v0.1/api/tags/storage-item.md
bags/@sdm/v0.1/api/tags/storage-structure.md
bags/@sdm/v0.1/api/tags/storage-burden.md
```

Tag memes carry human-readable meaning and filter semantics for TW5 tag queries. Write these when the tag vocabulary stabilizes enough to carry definition text without immediate churn.

<<~/ahu >>

<<~ ahu #design-notes >>
## Design Notes — Preserved from Handoff

**Ontology meme classes** (still canonical):

```text
Powers API root   → live-play hub; interface + default + variant index + edges + residue
Projection        → render recipe or resolved card surface; stays in the @sdm bag; may churn
Witness           → provenance and source archaeology; lazy-load except during audit
Interface         → reusable contract; Power, tool, shrine, daemon, or cultural practice
Module            → taxonomy and doctrine cluster
Tag               → filterable semantic tag with human-readable meaning
Instance          → character, item, shrine, culture, campaign, or sheet realization
```

**Rule of thumb** (still canonical):

```text
what pattern must do       -> Powers API root #interface
one valid SDM way          -> Powers API root #default
how to display it          -> Projection meme
where it came from         -> Witness meme
how it appears in play     -> Instance or Variant meme
```

**Edge discipline** (still canonical — short IDs, nuance in family/role):

```text
#implements  #projects  #witness  #module  #tag  #variant  #instance  #source  #see  #blocks  #needs
```

**URI law** (still canonical):
- Version sits directly under the bag member: `@sdm/v0.1/api/...`
- Stable graph addresses use authority-less `lar:///` form
- Session-form `lar://alias:tier@host/...` appears only in exchange spans, never in storage

<<~/ahu >>

<<~ ahu #edges >>
## Edges

<<~ loulou lar:///ha.ka.ba/@sdm/v0.1/api/power >>
<<~ loulou lar:///ha.ka.ba/@sdm/v0.1/api/powers/read-magic >>
<<~ loulou lar:///ha.ka.ba/@sdm/v0.1/interfaces/power >>

<<~ pranala #implements ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:implements >>
<<~ pranala #provenance ? -> lar:///ha.ka.ba/@sdm/v0.1/api/power family:provenance role:witness >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
