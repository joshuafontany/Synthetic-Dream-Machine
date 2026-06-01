<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@sdm/v0.1/epic/powers-composition-rewrite >>
```toml iam
uri-path  = "ha.ka.ba/@sdm/v0.1/epic/powers-composition-rewrite"
file-path = "bags/@sdm/v0.1/epic/powers-composition-rewrite.md"
type      = "text/x-memetic-wikitext"

tagspace  = "sdm"
register  = "CS"
confidence = 15
mana      = 19
manao     = 19
manaoio   = 18
cacheable = true
retain    = true
invariant = false
role      = "epic plan: SDM+ Powers as navigable composition space"
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~&#x0002;>>

# Epic — Powers Composition Rewrite

<<~ ahu #vision >>
## Vision

The SDM/VLG/UVG corpus already runs a composition system. Every Power carries
P/R/T/D/Ox. Every Power carries tags: `[anchored]`, `[attack]`, `[imbued]`,
`[dangerous]`. Every Power stores in a slot: Trait, Item, Burden. Every
activation checks the same protocol: pay Life equal to P, double without
skill, Danger Roll when P exceeds Level.

The published books hold the game. This epic gives each piece an **address**,
connects them with flat **`#has`** edges, and makes the space **navigable** —
a Jaquayed composition space where following a tag-connection reveals what
lies beyond the wall.

No new game mechanics. No new player-facing rules. The architecture lives
in the bag, surfaces on cards as clickable tag pills, and serves the
referee's improvisation and the converter's workflow.

**Version law.** Existing `@sdm/v0.1` → `@sdm/v0.0` (prototype archive).
New `@sdm/v0.1` built from scratch.

**Two layers.** Pattern (Pranala graph, stable): what Read Magic consists of.
Instance (TW5 data, mutable): what Lady Aki currently holds, how it mutated.

**One verb.** `#has`. Flat. No family, no role. Target URI carries semantics.
<<~/ahu >>

<<~ ahu #base >>
## The Base (Ha) — What Cannot Change

These come from Luka's SDM/VLG/UVG corpus. They publish as-is or with
light editing passes only.

**Power attributes** (canonical standard form):

| Attribute | What it names |
|---|---|
| **P** (Power Level) | Magnitude 0–99. Activation price. Danger threshold. |
| **R** (Range) | Distance at which the user activates |
| **T** (Target) | Thing, area, concept, or object affected |
| **D** (Duration) | Instantaneous → temporary → permanent |
| **Ox** (Overcharge) | Doubles P and price, modifies effect. x2, x4, x8, x16… |

**Non-standard attributes** (canonical hooks):

| Attribute | What it does |
|---|---|
| `[anchored]` | Physical anchor keeps power active; lose anchor, lose power |
| `[attack]` | Resolves against Defense, not as a save |
| `[focus]` | Requires sustained concentration; distraction deactivates |
| `[fueled]` | Consumes a component beyond Life |
| `[imbued]` | Life stays locked until power deactivates |
| `[item]` | Life locks into an object permanently until disabled |

**Cost protocol** (canonical):
- Pay Life = P level
- Pay with Ability Points at 1:1 parity
- Double cost without relevant skill
- `[imbued]` / `[item]` lock Life until condition ends

**Danger protocol** (canonical):
- Danger Roll when: no suitable skill, Level < P cost, or `[dangerous]` tag
- Roll d20 + ability + skill vs P cost target
- Natural 1 always fails
- Failure → Corruption procedure

**Storage** (canonical from Vastlands Guidebook + SDM template):
- **Trait**: 7 + Thought slots. Power engraved in body/mind/aura.
- **Item**: 7 + Strength slots. Power stored in object. Albums/grimoires
  hold multiple powers per slot (container mechanism).
- **Burden**: 20 slots. Each imposes -1 to all rolls. Overflow from Trait/Item.
  Curses, compulsions, afflictions.
- **Structure**: Power bound to a place — shrine, ship-daemon, archive service.
- **Location**: Power bound to a geographic site. (SDM template lists separately
  from Structure; decision pending on whether these merge or stay distinct.)

**Affinity interaction** (canonical from FTLS Ch03):
Tags already function mechanically: Heritage Affinities reduce P cost by 1
when the Power carries matching tags (e.g., `[illusion] [light] [void]`).
This proves tags-as-components at the table level — the composition model
addresses an interaction that already runs in the published rules.

**Conversion formula** (canonical):
- P2 ≈ 1st level spell, P4 ≈ 2nd, P6 ≈ 3rd, P18 ≈ 9th

**Tag catalog** (canonical from Appendix Null):
200+ tags organized by facet: Core mechanical (~40), Elements & Energies,
Dreams & Shadows, Totems & Spirits, Schools & Traditions, Clerical & Cult,
Artifacts & Practices, Weird Science, Misc/Playful. Additionally, FTLS Ch06
adds `[control]`, `[guided]`, `[ward]`, and the full ECM mode set (`[ecm]`
`[scan]` `[veil]` `[jam]` `[spoof]` `[negate]` `[suppress]` `[redirect]`
`[capture]` `[absorb]` `[hijack]`).

**Locked Powers** (canonical from FTLS Ch06):
Any Power attribute can arrive locked/encrypted/damaged. Unlock vectors:
RSS salvage, shrine permissions, corruption treatment, factional sponsorship.
Lock-state belongs in the instance-layer data.

**Rank tags** (placeholder from FTLS Ch06):
`[skilled]`, `[expert]`, `[master]` gate Power features behind character
Path rank. Represents vertical differentiation within the tag space.

This base does not change. The epic addresses it, links it, makes it queryable.
<<~/ahu >>

<<~ ahu #lineage >>
## Design Lineage — Prior Art That Carries Load

| Source | Design lesson for this architecture |
|---|---|
| **Ars Magica** | Technique + Form (5 verbs × 10 nouns) turns a spell list into a composable grammar. A wizard who knows *Creo Ignem* can spontaneously generate any fire-creation effect at lower power — fluency, not memorization. SDM components work the same way: `[ecm-scan]` + `[divination]` names what Read Magic does the way *Intellego Vim* names "I perceive magic." The covenant model grounds power in place and institution — directly maps to Structure mount-points and shrine services. |
| **Mage: Ascension/Awakening** | Paradigm determines affordance — the consensus field pushes back against workings it doesn't recognize. Paradox maps directly to SDM's Corruption/Wild Magic Danger Roll: exceed what the local reality permits, and reality notices. Awakening's Practice ladder (Knowing → Unveiling → Ruling → Unraveling → Making) gives a vocabulary for overcharge depth: P:2 reads (Knowing), P:4 pierces veils (Scrutiny), P:8 analyzes structure (Ruling), P:16 forces through hostile defenses (Unraveling, with Paradox as price). |
| **Jennell Jaquays** | Multiple entrances, vertical connections, faction dynamics, loops that reward exploration. Applied to Powers: follow any component tag and discover every module that shares it. Follow a different tag and find a different cross-section. `[dangerous]` cuts vertically through everything like a shaft between dungeon levels. The component graph gives Powers the topology Thracia gave dungeons. |
| **ECS / Rust traits** | Composition over inheritance. Entity = ID + components. Behavior emerges from what an entity currently holds, not from what it inherits. The `has-a` relationship can change at runtime — inventory, not identity. The flat `#has` edge follows this directly. |
| **Kabbalistic Tree** | Not all relationships run horizontal — some components operate at different levels of emanation. `[dangerous]` modifies the crossing event itself, sitting above capability tags like `[ecm-scan]`. The flat model may flatten a real vertical signal. Held as unresolved tension. |
| **Musical counterpoint** | Harmony emerges from the interaction of independent voices, not from inside any single voice. Two co-active Powers on the same entity may produce emergent effects neither carries alone. The component model captures melody (internal structure). A counterpoint doctrine would capture harmony (interaction rules for co-active modules). |
| **Hawaiian mana-kapu** | Power flows through maintained relationships, not possessed components. The shrine checks standing, not inventory. Mount-point contracts may need relationship preconditions — "do you honor the compact?" not just "do you have the right tag?" |
| **Sera (Silat Serak)** | Base-angle-lever: structure gates technique. You cannot throw the djuru unless you hold the correct langkah. Posture/stance tags may function as activation prerequisites, not just descriptive labels. The base precedes the technique. |
| **Chaos Magick** | Belief as mutable tool — same pattern, different paradigm, different result. The instance layer may carry the operator's current paradigm relationship to the pattern, not just mutation records. Discordian catma tradition (already in Lares boot) says: a module's component list names what the pattern affords *under the current paradigm*. |
<<~/ahu >>

<<~ ahu #principles >>
## Principles

1. **Name what exists.** The canonical SDM rules already run composition.
   This epic gives each piece an address and connects them. Do not invent
   new game mechanics.

2. **One verb, flat.** `#has`. Target URI carries semantics. No family/role.
   Queries distinguish components from mount-points by target path prefix
   (`components/` vs `mount-points/`), not by edge metadata.

3. **Pattern and instance.** Pranala graph = stable pattern definition
   (what Read Magic consists of). TW5 data fields = mutable instance state
   (what Lady Aki currently holds and how it mutated). Never mix layers.
   Instance state never enters the Pranala graph.

4. **Cards as mnemonic doorways.** Tag pills on every card serve double duty:
   mnemonics on paper (players learn `[ecm-scan]` as a keyword over sessions),
   doorways on screen (click through to the full component tiddler). Printed
   cards carry the mnemonic. Digital cards carry both. See `#progressive-display`.

5. **Complexity changes address, not quantity.** Decomposing a Power into
   components does not reduce complexity — it distributes it. If the
   distribution doesn't match how referees think about Powers, it hurts more
   than it helps. The nano-service trap applies: too many tiny component memes
   create cognitive load that exceeds the query value.

6. **Demote freely, promote reluctantly.** Tags start as TOML header entries.
   Promote to addressed component memes only when a filter query actually
   demands the address. If a promoted component proves unused by queries,
   demote it back to a header tag. Sprint 0 writes only the ~14 memes
   Sprint 1 actually uses.

7. **Mount-points carry contracts.** Trait, Item, Structure, Burden — each
   changes how a mounted module activates, what it costs, how it fails, and
   how it leaves. The same module behaves differently depending on which
   mount-point holds it. These contracts come from the canonical Vastlands
   Guidebook rules — the epic gives them addresses, not new rules.

8. **Aftermath as ecology.** Every noospheric crossing leaves a trace:
   recognition mark, daemon ping, corruption tick, ward echo, owner trace.
   The instance layer can accumulate these traces across sessions. The
   architecture permits this without enforcing it — each table chooses how
   much ecology to run.

9. **Practitioner state matters.** What a pattern does depends on who holds
   it, how they stand, and what they maintain. The instance layer may carry
   stance, relationship-state, and paradigm alongside variant and mutation
   data. This remains open design pressure from the Hawaiian, Sera, and
   Chaos Magick research — not yet settled into architecture.

10. **Start as modular monolith.** Write the three proof modules as self-
    contained memes with component tags in the TOML header AND as `#has`
    edges to addressed component memes. If Sprint 1 proves the addressed
    memes carry query value, continue the pattern. If only the TOML tags
    carry value, simplify the architecture to tags-only and skip the
    component meme tree.
<<~/ahu >>

<<~ ahu #architecture >>
## Bag Topology

```text
bags/@sdm/v0.1/
  templates/
    modules/power.md            <- module shape
    projections/powers/ftls-card.md
    witness/powers/osr-spells.md
    mount-points/storage-class.md
    components/tag.md
  mount-points/
    trait.md  item.md  structure.md  burden.md
  components/
    domain/{divination,abjuration,stuckforce,...}.md
    function/{ecm-scan,magic-decode,archive,cargo,ward,...}.md
    hook/{imbued,sustained,dangerous,fueled,focus,attack,anchored,...}.md
    posture/{ritual,instant,reaction,stance,...}.md
  modules/powers/
    {read-magic,floating-disc,shield-ward,...}.md
  projections/powers/ftls-card/
    {read-magic,floating-disc,shield-ward,...}.md
  witness/
    powers/osr-spells/{read-magic,floating-disc,shield-ward,...}.md
    architecture/v0.0-transition.md
  docs/
    composition-model.md
    power-ontology.md
```
<<~/ahu >>

<<~ ahu #edges >>
## Edges

| Edge | Meaning |
|---|---|
| `#has` | Composition (component, mount-point, any facet) |
| `#projects` | Render surface |
| `#witness` | Provenance |
| `#template` | Template use |
| `#composes` | Module-to-module (rider, trigger, chain) |
| `#modifies` | Layer interaction (dispel, anti-magic) |
| `#variant` | Named alternative |
| `#source` | Provenance source |
| `#see` | Cross-reference |
| `#retires` | Lifecycle |

Pranala form:

```text
<<~ pranala #has ? -> lar:///ha.ka.ba/@sdm/v0.1/components/function/ecm-scan >>
<<~ pranala #has ? -> lar:///ha.ka.ba/@sdm/v0.1/mount-points/trait >>
```
<<~/ahu >>

<<~ ahu #tw5-tags >>
## TW5 Tag Syntax — Component Representation

Component tags follow pono TW5 wikitext conventions. The tag title serves as
the stable TW5 identifier; the caption field renders the readable pill; the
lar-uri field carries the full versioned address.

### Tag Title Convention

```text
TW5 title:     @sdm/function/ecm-scan        ← bag-scoped, version-free, stable
caption:       ecm-scan                       ← display name for pills
lar-uri:       lar:///ha.ka.ba/@sdm/v0.1/components/function/ecm-scan  ← versioned address
```

The `@sdm/` prefix scopes to the bag without carrying a version number. The
title outlives version changes; the `lar-uri` field updates per version.

### Wikitext Forms

| Context | Syntax | Renders as |
|---|---|---|
| Card tag pill | `<<tag-pill @sdm/function/ecm-scan>>` | [ecm-scan] ← clickable, links to component |
| Inline link | `[[@sdm/function/ecm-scan]]` | fallback link (readable if not beautiful) |
| Filter: one tag | `[tag[@sdm/function/ecm-scan]]` | all tiddlers tagged with this component |
| Filter: AND | `[tag[@sdm/function/ecm-scan]tag[@sdm/domain/divination]]` | both tags |
| Filter: facet | `[tag[prefix[@sdm/function/]]]` | all function-facet components |
| Filter: all SDM | `[tag[prefix[@sdm/]]]` | all SDM components |

### TOML Tags in Module Memes

```toml
tags = [
  "@sdm/function/ecm-scan",
  "@sdm/function/magic-decode",
  "@sdm/function/archive",
  "@sdm/domain/divination",
  "@sdm/domain/apocrypha",
  "@sdm/hook/dangerous",
]
```

The TOML `tags` field mirrors the Pranala `#has` edges for TW5 native filter
compatibility. Pranala edges carry graph truth; TOML tags carry TW5 filter
sugar. Both resolve to the same component tiddler.

### The `<<tag-pill>>` Macro

A Sprint 0 deliverable. Reads the caption field from the target tiddler and
renders a pill-styled link. Falls back to the raw title if the caption field
doesn't exist. Writes once, deploys on every card.
<<~/ahu >>

<<~ ahu #progressive-display >>
## Progressive Display — Cards as Mnemonic Doorways

Power cards serve two functions simultaneously:

1. **Mnemonic device.** The card's P/R/T/D block, effect text, and tag pills
   give the player everything needed to activate the Power at the table.
   The tag pills read as short flavor labels: `[ecm-scan]` `[divination]`
   `[archive]`. A player who reads these pills over several sessions
   builds an intuitive vocabulary for the Powers space without studying
   the architecture.

2. **Doorway to the live wiki.** In a digital (TW5) context, every tag pill
   links to the component tiddler. Clicking `[ecm-scan]` opens the full
   component meme with `#definition`, `#activation`, `#interaction`, and a
   filter listing every other module that shares this component. The card
   becomes a navigation surface: each pill opens a corridor in the Jaquayed
   Powers space.

Printed cards carry the mnemonic function only. Digital cards carry both.
The architecture must serve both contexts — which means the tag pills must
read as meaningful flavor on paper and as functional links on screen.

### Card Rendering Example

```text
┌──────────────────────────────────────┐
│ READ MAGIC                           │
│ First Key, Archive Handshake         │
│                                      │
│ P: 2  R: self                        │
│ T: one magical inscription           │
│ D: 10 minutes                        │
│                                      │
│ You tune your ha-ka-ba pattern to    │
│ the writing and read its magical     │
│ interface layer. On a clean read,    │
│ the referee gives the active         │
│ meaning...                           │
│                                      │
│ Overcharge x2 (P:4): Read through    │
│ one weak veil...                     │
│                                      │
│ [ecm-scan] [magic-decode] [archive]  │
│ [divination] [apocrypha]             │
│ [trait] [item] [structure] [burden]  │
└──────────────────────────────────────┘
```

Bottom rows: component pills (what the Power does) and mount-point pills
(where the Power can seat). Each pill clicks through in the wiki. On paper,
each pill reads as a keyword the player learns over time.
<<~/ahu >>

<<~ ahu #shapes >>
## Meme Shapes

**Module** (mirrors canonical Power card + addressed edges):

```text
#has            flat Pranala edges to component and mount-point tiddlers
#default        P/R/T/D, effect text, overcharge, mishaps
#variants       named alternatives
#edges          projections, witnesses
#aftermath      open questions
```

Example `#has` + TOML tags (both point to same component tiddlers):

```toml
tags = ["@sdm/function/ecm-scan", "@sdm/domain/divination", "@sdm/hook/dangerous"]
```

```text
<<~ pranala #has ? -> lar:///ha.ka.ba/@sdm/v0.1/components/function/ecm-scan >>
<<~ pranala #has ? -> lar:///ha.ka.ba/@sdm/v0.1/components/domain/divination >>
<<~ pranala #has ? -> lar:///ha.ka.ba/@sdm/v0.1/mount-points/trait >>
```

**Mount-point**: `#contract #activation #cost #failure #removal #overflow #aftermath`

**Component**: `#definition #activation #interaction #filters #aftermath`

**Instance** (TW5 data, not Pranala):

```yaml
traits:
  - uri: lar:///ha.ka.ba/@sdm/v0.1/modules/powers/read-magic
    variant: thread-reading
    recognized: [spider-silk-runes, archive-of-kell]
    mutations: [spider-folk-webcraft]
    locks: null
  - uri: lar:///ha.ka.ba/@sdm/v0.1/modules/powers/linked-portals
    variant: null
    locks: {overcharge-x4: encrypted, name: damaged}
    unlock-progress: [shrine-of-kell-permission-pending]
```
<<~/ahu >>

<<~ ahu #sprints >>
## Sprints — Instructions for the Enacting Lares

### Sprint 0 — Ground

**What you do:** Mark the old tree. Build the new foundation. No Powers yet.

**S0.0 — Rename `bags/@sdm/v0.1/` → `bags/@sdm/v0.0/`.**
Batch-update all TOML `uri-path`, `file-path`, and internal edge URIs.
Set `retain = true`, `invariant = false` on all v0.0 memes.
Commit as one atomic change. Verify internal consistency.

**S0.1 — Write `docs/composition-model.md`.**
Doctrine: entity + module + component + mount-point. One verb (`#has`), flat.
Two layers (pattern graph / instance data). Progressive disclosure. Practitioner
state. Include the design lineage table and the three-weathers section from
this epic as grounding. Include instance-data YAML examples.

**S0.2 — Write `templates/modules/power.md`.**
Module shape: `#has`, `#default` (P/R/T/D/Ox), `#variants`, `#edges`, `#aftermath`.
Writing law: table-action language. The canonical SDM Power template (P/R/T/D/Ox
+ tags) IS the `#default` block. The `#has` block addresses the tags. That's it.

**S0.3 — Write mount-point memes + template.**
`mount-points/{trait,item,structure,burden}.md`. Extract the scattered prose
from Vastlands Guidebook pp.28-29 and SDM Quickstart. Give each: `#contract`,
`#activation`, `#cost`, `#failure`, `#removal`, `#overflow`, `#aftermath`.
The Burden mount-point's `-1 per slot` rule, the Trait slot count (7+Thought),
the Item slot count (7+Strength) — these are canonical facts that get addressed.
**Decision needed:** does `location` (from SDM template) merge with `structure`
or get its own mount-point? **Decision needed:** the Item mount-point must
address the container mechanism (albums, grimoires hold multiple Powers per
slot) — one mount-point with a container sub-rule, not separate mount-points
per container type.

**S0.4 — Write ~14 component memes + template.**
Address the tags that Read Magic, Floating Disc, and Shield Ward actually use.
TW5 title convention: `@sdm/{facet}/{slug}` (bag-scoped, version-free).
Caption field: short display name for pills. Lar-uri field: full versioned
address. Each gets: `#definition` (one sentence), `#activation` (how it
modifies the Power), `#interaction` (how it plays with other components),
`#filters`. Start with: `@sdm/domain/divination`, `@sdm/domain/abjuration`,
`@sdm/domain/stuckforce`, `@sdm/function/ecm-scan`, `@sdm/function/magic-decode`,
`@sdm/function/archive`, `@sdm/function/cargo`, `@sdm/function/barrier`,
`@sdm/function/ward`, `@sdm/hook/imbued`, `@sdm/hook/sustained`,
`@sdm/hook/dangerous`, `@sdm/hook/attack`, `@sdm/posture/ritual`.
**Caution (Principle 6):** if any component proves to carry no query value
during Sprint 1, demote it back to a TOML header tag and delete the meme.

**S0.6 — Write the `<<tag-pill>>` macro.**
A TW5 macro that reads the caption field from the target component tiddler
and renders a pill-styled link. Falls back to the raw title without the
caption. This macro deploys on every card projection. Sprint 0 deliverable
because Sprint 1 card projections depend on it.

**S0.5 — Write projection and witness templates.** Fresh for v0.1.

### Sprint 1 — Read Magic (Prove the Chain)

**What you do:** Write the first complete module-set. Prove the full chain.

**S1.1 — `modules/powers/read-magic.md`.**
The `#has` block: flat Pranala edges to the component and mount-point memes
you wrote in Sprint 0. The `#default` block: P:2, R:self, T:one magical
inscription, D:10 minutes. Copy the game text from the v0.0 Powers root,
but write it fresh — don't paste and edit. Overcharge x2/x4/x8. Mishaps.
Variants: Thread Reading, Archive Handshake, Grimoire Lens, Cursed Literacy.

**S1.2 — `projections/powers/ftls-card/read-magic.md`.**
Card surface using `<<tag-pill>>` macro for component and mount-point pills.
Card prose stays imperative table-language. Bottom rows show component pills
and mount-point pills. On paper: readable keywords. On screen: clickable
doorways into the Jaquayed Powers space.

**S1.3 — `witness/powers/osr-spells/read-magic.md`.**
Basic/Expert/RC witnesses. Written fresh from source material.

**S1.4 — `witness/architecture/v0.0-transition.md`.**
Record what v0.0 contained and why it retired.

**Acceptance test:**
- Module loads for play without pulling cold memes
- Card reads clean with visible tag pills
- All `#has` edges resolve to Sprint 0 memes
- No `#implements` anywhere in v0.1
- No family/role on any `#has` edge
- No edges into v0.0
- Each addressed component meme served at least one filter query (if not, demote)

### Sprint 2 — Floating Disc + Shield Ward (Validate)

Same process as Sprint 1 for two more Powers with different component profiles.
Write any new component memes needed. After all three exist: pattern review.
Compare side by side. Confirm the template generalizes. Surface anything that
wants `#composes` or `#modifies`.

### Sprint 3 — Beyond Spells (Extend)

One monster ability module. One magic item module. Test whether the same
template covers non-spell affordances. Decide module nesting: when an item
`#has` a Power, does it use the same module shape or a different one?

### Sprint 4 — Hard Cases (Stress)

One artifact. One curse (burden-class, involuntary). One shrine service
(structure-class, offering-based). Layer interaction doctrine: write the
`#modifies` edge semantics. Start the counterpoint doctrine: what happens
when two active modules interact on the same entity.

### Sprint 5 — Polish + Gate

Fresh `power-ontology.md`. Chapter 06 conversion checklist (not execution).
`#implements` web-wide retirement scope (separate epic).
<<~/ahu >>

<<~ ahu #acceptance >>
## Epic Acceptance

- [ ] v0.0 renamed, internally consistent
- [ ] No `interfaces/`, no `#implements`, no family/role on `#has`
- [ ] Three proof Powers as v0.1 modules with flat `#has`
- [ ] One each: monster, item, artifact, curse, shrine module
- [ ] Mount-point contracts for Trait, Item, Structure, Burden (+ Location decision)
- [ ] 20+ component memes (addressed from Appendix Null)
- [ ] Composition model doc with instance-data examples
- [ ] Layer interaction / counterpoint doctrine (even at `~:confidence[P],[4]`)
- [ ] Cards display tag pills via `<<tag-pill>>` macro linking to component tiddlers
- [ ] Tag titles follow `@sdm/{facet}/{slug}` convention with caption fields
- [ ] `<<tag-pill>>` macro exists and renders caption-as-pill for all component tiddlers
<<~/ahu >>

<<~ ahu #open-pressures >>
## Open Design Pressures

These surfaced during session research and remain deliberately unresolved.
Each names a force the architecture should accommodate without prematurely
resolving.

**Vertical vs flat.** Some components (like `[dangerous]`) modify the
activation protocol itself, sitting structurally above capability tags like
`[ecm-scan]`. Flat `#has` treats them as peers. The Kabbalistic Tree model
treats them as different levels of emanation. The current architecture
flattens this on purpose (to avoid premature hierarchy), but Sprint 4 should
test whether the flatness loses a real signal.

**Nano-service trap.** If components split too fine (`ecm-scan-passive`,
`ecm-scan-active`, `ecm-scan-contested`), the registry fragments into noise.
Mitigation: Principle 6 (demote freely, promote reluctantly) and Principle 10
(start as modular monolith). Sprint 1 acceptance should evaluate whether each
addressed component meme actually served a query.

**Counterpoint.** The component model captures what each Power consists of
(melody). It does not yet capture what two co-active Powers produce when both
run on the same entity (harmony). However, FTLS Ch06's ECM system already
provides the first vocabulary for module-on-module interaction: `[negate]`,
`[suppress]`, `[redirect]`, `[capture]`, `[hijack]` name the hard-counter
modes. Sprint 4 should extend this existing system rather than inventing
from scratch. The `[ecm]` tag already marks Powers that target the noospheric
substrate — active powers, activations, and etheric sensing.

**Relationship preconditions.** Hawaiian mana-kapu says the shrine checks
your standing, not your inventory. Sera says the base gates the technique.
Mount-point contracts currently describe *what changes when something mounts
here*. They may also need to describe *what relationship must hold for the
mount to accept the module*. This remains speculative until play tests it.

**Paradigm mutability.** Chaos Magick says belief functions as a tool —
same pattern, different paradigm, different activation behavior. The
instance-layer YAML currently tracks variant, recognized surfaces, and
mutations. It may also need to track the operator's current frame/paradigm
relationship to the mounted pattern. This remains speculative.
<<~/ahu >>

<<~ ahu #aftermath >>
## Aftermath

- **Filter ergonomics.** Test target-URI-prefix filtering in Sprint 1.
- **Module nesting.** Item-carrying-Power: `#has` or `#composes`? Sprint 3.
- **Counterpoint doctrine.** Co-active module interaction rules. Sprint 4.
  Start from the existing FTLS ECM vocabulary (`[scan]` `[veil]` `[jam]`
  `[negate]` `[suppress]` `[redirect]` `[capture]` `[hijack]`) — these
  already name the layer-interaction modes the `#modifies` edge reaches for.
- **Location vs Structure.** The SDM template lists `location` and `structure`
  as separate storage classes. Decide: one mount-point or two? Sprint 0.
- **Power containers.** Albums, grimoires, and technocodices hold multiple
  Powers per Item slot. The Item mount-point contract must address container-
  sharing. Sprint 0.3.
- **Locked Powers as instance data.** Lock-state (which attributes remain
  locked/encrypted/damaged) and unlock-progress belong in the instance-layer
  YAML alongside variant and mutations.
- **Rank tags as vertical component.** `[skilled]`/`[expert]`/`[master]`
  represent vertical gating within the flat `#has` space. The Kabbalist
  pressure finds an anchor here — not all tag-relationships run horizontal.
  Decide whether rank tags get component memes or stay as TOML-only markers.
- **Practice ladder.** Overcharge-as-depth gradient may want named components.
- **`#implements` web-wide.** Separate epic.
- **Bulk conversion.** ~100+ Powers behind Sprint 5 gate.
<<~/ahu >>

<<~ ahu #meme-edges >>
## Edges

<<~ loulou lar:///ha.ka.ba/@sdm/v0.0/witness/powers/handoff-archive >>
<<~ loulou lar:///ha.ka.ba/@sdm/v0.0/api/power >>

<<~ pranala #retires ? -> lar:///ha.ka.ba/@sdm/v0.0/interfaces/power family:lifecycle role:retires >>
<<~ pranala #retires ? -> lar:///ha.ka.ba/@sdm/v0.0/templates/api/power family:lifecycle role:retires >>
<<~ pranala #see ? -> lar:///ha.ka.ba/@sdm/v0.0/witness/powers/handoff-archive family:provenance role:see >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
