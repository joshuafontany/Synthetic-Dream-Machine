<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@sdm/v0.1/handoff/powers-architecture >>
```toml iam
uri-path  = "ha.ka.ba/@sdm/v0.1/handoff/powers-architecture"
file-path = "bags/@sdm/v0.1/handoff/powers-architecture.md"
type      = "text/x-memetic-wikitext"

tagspace = "ftls"
register = "CS"
confidence = 0.84
mana = 0.78
manao = 0.86
manaoio = 0.82
cacheable = true
retain = true
invariant = false
role = "handoff meme for local Lares council implementing FTLS Powers as file-first memetic-wikitext in an Automerge/TW5 bag"
```

<<~&#x0002;>>

# Handoff — FTLS Powers Memetic Architecture

<<~ ahu #kahea >>
## Kahea to the Local Lares Council

Local Lares council, receive this handoff as an active working meme.

You sit inside the repo, on branch context supplied by the operator. Treat this document as the current design pressure for the `@ftls` Powers bag. Work in e-prime where possible. Keep the operator steering; you crew.

Do not rebuild the whole Powers chapter. Establish the new memetic space by proving one small chain: `Read Magic` as a Powers API root, one FTLS game-card projection, and one OSR witness meme.

<<~/ahu >>

<<~ ahu #operator-intent >>
## Operator Intent

The operator wants `@ftls` Powers to move from large markdown chapters into composable `text/x-memetic-wikitext` memes hosted in a TiddlyWiki5 VM and synchronized through Automerge bags.

Current authoring happens on disk. Browser clients do not yet provide reliable live authoring. Therefore:

- memes live as markdown files on disk;
- the bag represents a composable wiki recipe and an Automerge document;
- everything eventually appears as TW5 tiddlers in the wiki runtime;
- no separate `.tid` export path should anchor the design yet;
- `projections/` stay inside the bag because projection recipes belong to the shared wiki corpus, not to disposable build output.

<<~/ahu >>

<<~ ahu #uri-law >>
## URI and Path Law

Use the updated version placement. The version sits directly under the bag member:

```text
lar:///ha.ka.ba/@sdm/v0.1/api/powers/read-magic
```

Mirror this on disk:

```text
bags/@sdm/v0.1/api/powers/read-magic.md
```

Do not use the older buried version pattern:

```text
lar:///ha.ka.ba/@ftls/api/v0.1/powers/read-magic
```

Use authority-less `lar:///` addresses for stable graph and meme addresses. Use session-form `lar://alias:tier@host/...` only in exchange spans.

<<~/ahu >>

<<~ ahu #ontology >>
## Pono Powers Ontology

Carry these meme classes downstream.

```text
Powers API root meme
  summonable hub for live play
  holds interface + default implementation + variant index + edges + residue

Projection meme
  render recipe or resolved render surface
  may churn as FTLS game-card design matures
  stays in the @bag

Witness meme
  provenance and source archaeology
  lazy-load except during audit/conversion/source work

Interface meme
  reusable contract that a Power, tool, shrine, daemon, or cultural practice can implement

Module meme
  taxonomy and doctrine cluster

Tag meme
  filterable semantic tag with human-readable meaning

Instance meme
  actual character, item, shrine, culture, campaign, or sheet realization
```

Rule of thumb:

```text
what pattern must do       -> Powers API root #interface
one valid SDM way          -> Powers API root #default
how to display it          -> Projection meme
where it came from         -> Witness meme
how it appears in play     -> Instance or Variant meme
```

<<~/ahu >>

<<~ ahu #powers-api-root-contract >>
## Powers API Root Contract

A Powers API root meme should stay lean enough to summon during play.

Required ahu:

```text
#interface
#default
#variants
#edges
#residue
```

Avoid embedding long projection or witness bodies in the Powers API root. Link them with short, TW5-filter-friendly edges.

A Powers API root may mention a projection or witness in prose, but the full projection and full witness should live in linked memes.

<<~/ahu >>

<<~ ahu #template-split >>
## Template Split Plan

Power meme-sets now split reusable format language from playable game content.

Root template memes carry the meta-contracts:

```text
bags/@sdm/v0.1/templates/api/powers/powers-root.md
bags/@sdm/v0.1/templates/projections/powers/ftls-card.md
bags/@sdm/v0.1/templates/witness/powers/osr-spells.md
```

Concrete Power meme-sets should use those templates through `#template` edges, then stay clean and table-facing:

```text
api/powers/<power>.md                         -> Powers API root: interface/default/variants/edges/residue
projections/powers/ftls-card/<power>.md       -> playable card surface only
witness/powers/osr-spells/<power>.md          -> cold provenance and conversion anchors
```

Delete chat-thread scaffolding when it only explains the design process. Preserve only the noets that clarify pono intent, loader behavior, or audit value, and move those into templates.

<<~/ahu >>

<<~ ahu #edge-discipline >>
## Edge Discipline

Keep edge IDs short for future TW5 filter work. Put nuance in `family` and `role`.

Preferred edge IDs:

```text
#implements
#projects
#witness
#module
#tag
#variant
#instance
#source
#see
#blocks
#needs
```

Examples:

```text
<<~ pranala #implements ? -> lar:///ha.ka.ba/@sdm/v0.1/api/interfaces/power family:control role:implements >>
<<~ pranala #projects ? -> lar:///ha.ka.ba/@sdm/v0.1/projections/powers/ftls-card/read-magic family:render role:projects >>
<<~ pranala #witness ? -> lar:///ha.ka.ba/@sdm/v0.1/witness/powers/osr-spells/read-magic family:provenance role:witness >>
<<~ pranala #module ? -> lar:///ha.ka.ba/@sdm/v0.1/api/modules/knowledge-oracle family:taxonomy role:belongs >>
<<~ pranala #tag ? -> lar:///ha.ka.ba/@sdm/v0.1/api/tags/ecm-scan family:tag role:has >>
```

Do not encode the full predicate inside the edge id. Let future filters find `#witness`, `#projects`, or `#implements` quickly.

<<~/ahu >>

<<~ ahu #bag-topology >>
## Initial Bag Topology

Use this topology for the first proof.

```text
bags/
  @sdm/
    v0.1/
      templates/
        api/
          powers/
            powers-root.md
        projections/
          powers/
            ftls-card.md
        witness/
          powers/
            osr-spells.md
      api/
        powers/
          read-magic.md
        interfaces/
          power.md
          ecm-scan.md
          magic-decode.md
          archive-recognition.md
        modules/
          knowledge-oracle.md
        tags/
          power.md
          ecm-scan.md
          storage-trait.md
          storage-item.md
          storage-structure.md
          storage-burden.md
      projections/
        powers/
          ftls-card/
            read-magic.md
      witness/
        powers/
          osr-spells/
            read-magic.md
```

The projection path above represents a resolved first card surface for `Read Magic`. The reusable FTLS card template now lives at:

```text
bags/@sdm/v0.1/templates/projections/powers/ftls-card.md
```

Do not move resolved card text into the template; let real cards expose their churn.

<<~/ahu >>

<<~ ahu #ooda-ha >>
## OODA-HA Work Loop

✶ **Observe:** Read existing Powers chapter context, conversion crosswalk, and current `Read Magic` sketch. Confirm that `Read Magic` still serves as POC-0.

⏿ **Orient:** Keep Power, Projection, and Witness as linked memes. Keep projection inside `@ftls` bag. Keep witness lazy-loadable.

◇ **Decide:** Create root templates for the three meme-set parts, then create the concrete Read Magic core, card projection, and OSR witness.

▶ **Act:** Write the template memes and the three Read Magic files. Use the updated URI path convention. Keep edges short. Keep the `/api/powers` meme lean.

⤴ **Verify:** A live-play request for `Read Magic` should load the Powers API root plus projection without loading the witness unless source archaeology enters the prompt.

↺ **Aftermath:** Carry any unresolved ontology questions into `#residue`, not into hidden assumptions.

<<~/ahu >>

<<~ ahu #acceptance >>
## Acceptance Criteria

The first proof passes when:

- root templates exist for Powers API root, FTLS card projection, and OSR spell witness;
- `Read Magic` Powers API root has `#interface`, `#default`, `#variants`, `#edges`, and `#residue`;
- `Read Magic` projection has a playable FTLS card surface without template/design chatter;
- `Read Magic` witness preserves Basic, Expert, and Rules Cyclopedia conversion anchors without turning into the live implementation;
- the Powers API root links to projection and witness through short edge ids;
- no `.tid` export assumption anchors the architecture;
- version placement follows `@sdm/v0.1/...`;
- e-prime drift stays low enough that the text reads as procedure, not metaphysical overclaim.

<<~/ahu >>

<<~ ahu #first-task >>
## First Task

Create or revise these files:

```text
bags/@sdm/v0.1/templates/api/powers/powers-root.md
bags/@sdm/v0.1/templates/projections/powers/ftls-card.md
bags/@sdm/v0.1/templates/witness/powers/osr-spells.md
bags/@sdm/v0.1/api/powers/read-magic.md
bags/@sdm/v0.1/projections/powers/ftls-card/read-magic.md
bags/@sdm/v0.1/witness/powers/osr-spells/read-magic.md
```

Then stop. Do not migrate the rest of Chapter 06 yet.

<<~/ahu >>

<<~ ahu #edges >>
## Edges

<<~ loulou lar:///ha.ka.ba/@sdm/v0.1/api/powers/read-magic >>
<<~ loulou lar:///ha.ka.ba/@sdm/v0.1/projections/powers/ftls-card/read-magic >>
<<~ loulou lar:///ha.ka.ba/@sdm/v0.1/witness/powers/osr-spells/read-magic >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >>

<<~ pranala #implements ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:implements >>
<<~ pranala #see ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/lar-uri family:reference role:see >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
