# TODO: BECMI -> SDM Magic Item Conversion (Chapter 05+)

## Intent
Convert BECMI/RC magic-item procedures into SDM chapter-ready form using the current canonical SDM model:
- Core mechanics baseline: `Synthetic_Dream_Machine_01_Quickstart.md`
- Gear/item/vehicle table surface: `Synthetic_Dream_Machine_05_Gear_Index.md` (near-final, catalog-focused)
- Conversion-governance master: `_todo/BECMI/TODO_BECMI_Conversion.md`
- Loot integration acceptance: `_todo/ftls/TODO_Loot_Treasure_Conversion.md`

This TODO is the execution tracker for magic-item conversion specifically.

Current sequencing gate:
- New Chapter 05 bridge batches are paused until Chapter 06 Powers has design decisions locked and reaches `alpha` state.

Sequencing lock status (2026-04-01):
- Chapter 06 design decisions: locked.
- Chapter 06 `osr:` import pass: complete (203/204 rows `osr: imported = yes`, 1 `[needs-review]`).
- Chapter 06 `alpha`: not yet declared; alpha verification pending (tag consistency, overcharge consistency, recognizer discoverability, Level/Power Level boundaries).
- Crosswalk confidence gate: approved working infrastructure at `0.90 / 1.00` floor-based.
- Ch05 rebuild script: archived. Ch05 structure generation artifact: removed.
- New Chapter 05 bridge edits remain paused until Chapter 06 alpha verification completes and `alpha` is declared.
- Chapter 05 structural reorganization (power-card and section layout work) is required before the full SDM+OSR source import and conversion/synthesis pass. This is a distinct gate from the OSR power-text import gate — do not conflate.

## Canonical Context (Locked)

### Baseline Ownership
- Quickstart owns core mechanics (inventory, advancement, hallmark lifecycle, caravan/trade core procedures).
- Gear Index owns gear/item/vehicle catalogs and gear tables.
- Magic-item generation and adjudication depth belongs in Chapter 05 magitech/fantascience lane.

### Scope Boundary
- This pass converts BECMI/RC magic-item procedure behavior into SDM structure.
- This pass does not re-open Quickstart core rules or Gear catalog ownership.
- Domain/tax systems remain out of scope for this pass.

### Alignment Priority
- `Synthetic_Dream_Machine_05_Gear_Index.md` controls item-facing presentation:
  - tags,
  - bulk,
  - slot pressure,
  - ward/armor language,
  - catalog-facing output format.
- `sdm/Vastlands_Guidebook/Vastlands_Guidebook.md` controls everyday weird-gear tone:
  - wards,
  - albums,
  - strange items,
  - mods,
  - portable occult gear.
- `sdm/Our_Golden_Age/Our_Golden_Age.md` controls relic consequence and metaphysical pressure:
  - shrines,
  - godsign,
  - signals,
  - daemon/noosphere interfaces,
  - buildertech,
  - seizure-worthy apparatus.
- BECMI/RC remains the recognizable procedural substrate, not the dominant chapter identity.
- UVG and Magitecnica remain support sources only where they sharpen oldtech texture or power-boundary handling.

## Conversion Goals
1. Preserve recognizable RC/BECMI procedural cadence for item generation and handling.
2. Express converted procedure steps in SDM-native language and anchor structure.
3. Keep Chapter 05 as single source of truth for detailed magic-item generation flow.
4. Keep Loot and Gear chapters pointer-driven for magic-item generation details.
5. Reduce adjudication ambiguity while keeping optional compatibility overlays explicit.

## State of Play
- Chapter 05 front-end procedure is usable: the FTLS object loop, identification flow, charge/failure handling, curse handling, and consequence recording are in place.
- module catalogs exist for potions, scrolls, wands/staves/rods, rings, miscellaneous items, armor/shields/wards, missile weapons, swords, and miscellaneous weapons.
- Numeric ontology pass is locked doctrine: BECMI character/caster levels, creature HD, and spell tiers convert to SDM `Level` and `Power Level` by the rules below.
- Phase A mechanical cleanup is complete in the current manuscript pass and preserves BECMI-facing names while replacing the remaining internal D&D assumptions.
- Armor/shield Defense has been corrected to SDM additive armor bonuses and is now the model example for `retain API, replace internals`.
- The spell/effect crosswalk that feeds Chapter 05 and Chapter 06 now has a full flat catalog, preserved cross-tradition class/spell metadata, and an SDM-first grouped module layer.
- Grouped `partial` rows have been synced back into the flat catalog; the current crosswalk execution focus is Chapter 06 multi-witness `osr:` import and tracker-state normalization, not new Chapter 05 bridge drafting.
- Remaining Chapter 05 work is now mostly downstream bridge and consistency work: consume the stronger crosswalk doctrine for item-interface rows, finish deferred classic-name mappings, and run cross-chapter validation.

## API Conversion Doctrine

### Public API Surface to Preserve
- Preserve classic item names.
- Preserve classic spell and effect names when they serve as recognizers.
- Preserve familiar module labels and subtable names where they improve lookup and nostalgia.
- Preserve BECMI-facing labels as the user-facing API surface, not as rules authority.

### Internal Implementation to Replace
- `AC` and descending-defense logic become additive `Armor` and `Defense`.
- `hit points` become `Life`.
- Class gates become Traits, practices, bearer requirements, or gear-compatibility constraints.
- BECMI spell tiers become SDM `Power Level`.
- BECMI character/caster level and monster `HD` become SDM `Level`.
- Attack math, save math, and combat modifiers become SDM roll language, save language, and `[+]` / `[-]`.

### Reference Priority
- `Synthetic_Dream_Machine_01_Quickstart.md` is the rules truth.
- `Synthetic_Dream_Machine_05_Gear_Index.md` controls item math, item presentation, tags, armor/ward/weapon scale, and slot/bulk language.
- `Synthetic_Dream_Machine_04_Powers_Index.md` controls storage/use language for anything that behaves like stored, triggered, reflected, repeated, or anchored powers.
- `Synthetic_Dream_Machine_03_Traits_Index.md` is the reference for classless identity replacements and bearer-facing trait hooks.
- `Synthetic_Dream_Machine_06_Campaign_Regions.md` only matters when location, faction, or world-process context materially affects an item.
- `Vastlands_Guidebook`, `Our_Golden_Age`, and `Ultraviolet_Grasslands_and_the_Black_City_2e` guide tone, weirdness, and object identity; they do not overrule SDM mechanics.

## Conversion Standards
- Mechanics-first, terminology-second:
  - first convert procedure behavior; then normalize naming where appropriate.
- No core-rule duplication:
  - do not restate Quickstart core mechanics unless required as a concise pointer.
- Gear consistency:
  - when a procedure depends on item classes/tables, route to Gear anchors.
- Overlay discipline:
  - each RC/BECMI compatibility behavior must be optional and disableable.
- Traceability:
  - each converted subsection should map to source module and canonical SDM destination anchor.

## Conversion Reference Notes

### Numeric Ontology Template
- Use this as a conversion reference, not as chapter-front matter.
- Convert BECMI character- and caster-level references to SDM `Level` by halving and always rounding up.
- Convert BECMI creature `HD` references to SDM `Level` by halving and always rounding up. Do not confuse source `HD` with SDM `Hero Dice (HD)`.
- Convert BECMI spell tiers to SDM `Power Level` with `Spell Level x2`; cantrips and other minor at-will or `x/day` free effects become `Power Level 1`.
- Chapter-facing text should be `SDM only`; keep source numbers here, not inline in the manuscript.
- Preferred numeric buckets:
  - `Level` for entity potency, caster potency, summon strength, dispel/remove-curse force, and creature-filter thresholds
  - `Power Level` for storage limits, archive capacity, spell eligibility, and direct spell-tier conversion
- Reference examples:
  - `3 HD -> Level 2`
  - `7 HD -> Level 4`
  - `15 HD -> Level 8`
  - `26th level caster -> Level 13 practitioner`
  - `36th level cleric -> Level 18 holy practitioner`
  - `1st-level spell -> Power Level 2`
  - `4th-level spell -> Power Level 8`
  - `cantrip/minor at-will or x/day effect -> Power Level 1`

### Exceptional Ability Template
- Use this as a conversion reference, not as chapter-front matter.
- When a source item says an ability becomes `exceptional`, `exceptionally high`, or otherwise exceeds normal human limits, convert it to SDM as follows:
  - treat the boosted ability as `+5` for as long as the effect lasts,
  - if the bearer already has `+5`, do not increase it further; instead grant `[+]` on the first directly relevant roll each round or scene,
  - apply the boosted value to any derived SDM stat that clearly uses that ability.
- Adventure-facing guidance for item rewrites:
  - Strength: use for forcing, lifting, carrying, climbing, smashing, and similar brute-force gates; if force is the only real obstacle and footing/time are favorable, allow success without a roll.
  - Agility: use for stunts, balance, stealth movement, dodging, and physical Defense.
  - Endurance: use for poison, disease, exposure, fatigue, and bodily-hardship saves; body-hardening effects may also grant `5` temporary Life, lost first.
  - Thought, Charisma, Aura: use when the item’s interface or the active obstacle is clearly routed through that ability.
- Preferred item-description pattern:
  - say exactly which ability becomes `+5`,
  - note any direct derived-stat effect that matters in play,
  - note any special rider such as temporary Life or unarmed damage,
  - avoid pointing the reader to an abstract rule block unless the chapter already has a stable inline rules glossary.

## Shared Phase Tracker

### Phase A: Mechanical Resolution Cleanup
- Remove remaining hidden D&D math while keeping item names and module labels intact.
- Convert `saving throw` variants into SDM save language.
- Convert `attack roll` / `to hit` / `easier to hit` text into Defense modifiers, attack bonuses, or `[+]` / `[-]`.
- Convert `morale` / `reaction` imports into Quickstart procedures or neutral referee calls.
- Convert `no saving throw` to `no save`.
- Convert lingering experience-level loss and combatant-level logic to SDM `Level`.
- Status: completed in the current Chapter 05 manuscript pass.
- Completion notes:
  - `Staff of Harming`, `Snake Staff`, `Animal Control`, `Drums of Panic`, `Reflection`, and the remaining flagged missile entries now use SDM-native attack/save/disposition wording.
  - Quickstart morale remains an allowed explicit import where it is already canonical and cleaner than bespoke fear text.
  - Chapter-facing prose no longer relies on `attack roll`, `reaction`, `save vs`, `caster level`, `spell level`, `level loss`, or `THAC0`.

### Phase B: Power / Spell API Bridge
- Keep classic names like `Spell Scroll`, `Ring of Spell Storing`, `Staff of Healing`, and `Raise Dead`.
- Route internal behavior through SDM `power` language.
- Use `Power Level` for storage, eligibility, and capacity.
- Use `Level` for source force, dispel/counterforce, summon strength, and curse removal strength.
- Add TODO-side bridge notes for ambiguous or unmapped classic spell names.
- Minimum viable bridge inputs now live in `_todo/BECMI/TODO_BECMI_Spell_Effect_Crosswalk.md`, but that document is now being expanded into the full canonical spell crosswalk for Chapter 06 rather than remaining a Chapter 05-only bridge sheet.
- Phase B should explicitly clear these bridge tasks before any Phase C module conversion resumes:
  - confirm seeded crosswalk coverage for the Chapter 05 recognizer set,
  - confirm the seeded entries keep current `direct`, `partial`, `custom`, or `undecided` status after each focused cleanup,
  - resolve deferred bundle notes for `Staff of Elemental Power`, `Staff of Power`, and `Staff of Wizardry`,
  - record the SDM-facing storage / trigger / counterforce rule for each `partial` item-effect.
- Phase B acceptance gate:
  - do not treat Phase B as complete until the Chapter 05 recognizer set has source anchors, mapping status, and enough bridge text to let module conversion proceed without ad hoc spell interpretation.
- Chapter 05 is now a downstream consumer of the broader full-spell pass rather than the phase-defining driver for spell staging scope.
- Deferred bridge examples from the Phase A completion pass:
  - `Staff of Elemental Power` effect names and elemental counter-negation phrasing
  - `Staff of Power` and `Staff of Wizardry` spell-name bundles
  - ring and armor entries that still preserve classic effect names as recognizers without a full SDM `power` mapping
- Phase B bridge delta (2026-03-23, batch 1):
  - added explicit bundled-recognizer bridge rules in Chapter 05 `Legacy Staff Descriptions`
  - converted `Staff of Power` and `Staff of Wizardry` bundle wording to explicit `Power Level` payload language with stated `Level` source-force handling
  - removed slot-era `prepared or memorized` wording from `Ring of Spell Eating` and rewired it to SDM-ready payload terminology
  - clarified `Ring of Spell Storing` as `Power Level` payload capacity handling rather than slot retention
- Phase B bridge delta (2026-03-25, batch 2 sync):
  - crosswalk Expert lane now has zero `undecided` rows, reducing bridge-side ambiguity for Expert recognizers used by item interfaces and counterforce procedures
  - `Protection from Magic` and `Ring of Spell Turning` now carry explicit ECM boundary/reflection behavior, ready to be consumed by Chapter 05 reflected/blocked payload wording
  - `Ice Storm/Wall` status formatting was normalized to canonical status syntax, preventing downstream parser/readability drift in bridge notes

### Phase C: module-by-module Internal Conversion
- Standardize each module in this order:
  1. Potions / Oils / Elixirs
  2. Scrolls / Formulae / Map-Documents
  3. Wands / Staves / Rods
  4. Rings / Amulets / Charms
  5. Miscellaneous Items / Strange Items / Oddities
  6. Armor / Shields / Wards
  7. Missile Weapons / Missiles
  8. Swords
  9. Miscellaneous Weapons
- For each module, standardize trigger/activation model, bearer requirements, resolution language, damage/Defense/save scale, control/charm/fear/drain behavior, charge/depletion/failure model, and the SDM-facing output record.

### Phase D: Back-Half System Conversion
- Convert `Building, Modding, and Salvage Conversion` into SDM-native formulas and thresholds.
- Convert `Field Archives, Albums, and Grimoires` into SDM-native archive/storage procedure language.
- Route formulas through SDM `Level`, `Power Level`, slots, burdens, and Gear/Powers anchors.
- Remove remaining `INT/WIS`, spell-slot, and gp/enchantment assumptions from chapter-facing prose unless preserved only as TODO notes.

### Phase E: Final Consistency and Acceptance Pass
- Verify Chapter 05 no longer depends on forbidden mechanics terms in chapter-facing prose.
- Verify consistent use of `Level`, `Power Level`, `Armor`, `Ward`, `Life`, and `Defense`.
- Verify each module preserves BECMI-facing labels while using SDM-facing internals only.
- Sync accepted doctrine and remaining exceptions back into this TODO and the master conversion TODO.

## Source Inputs
- Primary conversion source:
  - `_becmi/TSR 1071 - The D&D Rules Cyclopedia.pdf` (magic-item procedure bands)
- SDM context sources:
  - `sdm/Our_Golden_Age/Our_Golden_Age.md`
  - `sdm/Vastlands_Guidebook/Vastlands_Guidebook.md`
  - `sdm/Ultraviolet_Grasslands_and_the_Black_City_2e/Ultraviolet_Grasslands_and_the_Black_City_2e.md`
- Canonical destination references:
  - `Synthetic_Dream_Machine_01_Quickstart.md`
  - `Synthetic_Dream_Machine_05_Gear_Index.md`

## Chapter Targets
- Primary chapter target:
  - `ftls/Flying_Triremes_and_Laser_Swords_05_Magitech_and_Fantascience.md`
- Pointer-only chapter target:
  - `ftls/Flying_Triremes_and_Laser_Swords_09_Loot_and_Treasure.md`

## Active Work Plan

### Sequencing Gate: Chapter 06 First
- [ ] Confirm Chapter 06 design decisions are locked for activation, payment, storage, overcharge, and scale semantics.
- [ ] Confirm Chapter 06 is in `alpha` state.
- [ ] Resume Phase B Chapter 05 bridge work only after both gate checks are complete.

### Phase 1: Procedure Inventory and Crosswalk
- [x] Build module-level crosswalk for magic-item procedures:
  - generation,
  - identification,
  - charges/consumption,
  - curse/complication handling,
  - creation/fabrication,
  - market buy/sell handling.
- [x] Mark each module as:
  - `direct map`,
  - `partial map`,
  - `custom SDM procedure needed`.
- [x] Assign each item module to a primary FTLS lane:
  - field gear and practical weird objects,
  - relics, buildertech, and restricted apparatus,
  - conversion, modding, faults, and curses.

### Phase 2: Chapter 05 Procedure Consolidation
- [x] Consolidate the chapter front-end around an FTLS object loop and SDM item output record.
- [x] Add a Phase 1 overlay spine:
  - `FTLS Object Procedure`,
  - `Object Families Catalog`,
  - `Classic Recognizers and Old-School Effect Coverage`.
- [x] Keep strong old-school recognizers in the intermediate chapter state:
  - named effects,
  - iconic item behaviors,
  - familiar module subtables and weapon riders.
- [x] Convert first module slices into stronger FTLS catalog entries while keeping dense import support:
  - potions / oils / elixirs,
  - scrolls / formulae / map-documents.
- [x] Convert next module slices into stronger FTLS catalog entries while keeping dense import support:
  - wands / staves / rods,
  - rings / amulets / charms.
- [x] Convert next module slices into stronger FTLS catalog entries while keeping dense import support:
  - miscellaneous items / strange items / oddities,
  - armor / shields / wards.
- [x] Convert weapon module slices into stronger FTLS catalog entries while keeping dense import support:
  - missile weapons / missiles,
  - swords,
  - miscellaneous weapons.
- [x] Consolidate the detailed middle of Chapter 05 into compatibility support bands:
  - generation support,
  - identification and use support,
  - risk and fallout support,
  - retention and conversion support,
  - source-module effect coverage.
- [x] Ensure chapter internal structure follows runnable loop order:
  - generate -> identify -> activate/use -> deplete/fail/curse -> repair/create -> market interface.
- [x] Add explicit boundary pointers to Chapters 04, 06, 07, and 09.
- [x] Remove/replace any duplicate procedure text in other chapters with pointers.
- [x] Promote shared module-resolution and item-use defaults from compatibility support into the core `Anomalous Object Procedure`.
- [x] Upgrade module catalog blocks into runnable mini-procedures for common imported items.
- [x] Add compact FTLS resolver inserts for armor, ranged weapons, swords, and weapon secondary riders.
- [x] Demote compatibility support bands to secondary expansion status instead of primary ownership.

### Phase 3: Gear/Quickstart Alignment
- [ ] Verify no converted magic-item procedure conflicts with Quickstart core mechanics.
- [x] Re-anchor Chapter 05 outputs to Gear Index-facing fields:
  - object name,
  - class/module,
  - tags,
  - bulk/slot pressure,
  - trigger mode,
  - usage model,
  - risk note,
  - company consequence,
  - legal/faction/divine attention.
- [ ] Verify table/category references align with current Gear Index headings/anchors.
- [ ] Keep hallmark progression references aligned with Quickstart canonical upgrade model.

### Phase 4: Loot Handoff Validation
- [x] Ensure Loot/Treasure chapter uses handoff references to Chapter 05 (not duplicate generation logic).
- [ ] Validate end-to-end flow:
  - treasure result -> magic-item handoff -> generation/adjudication -> table-facing outcome.

### Phase 5: Optional Terminology Normalization
- [ ] Apply controlled RC-term -> SDM-term naming normalization only after mechanics are stable.
- [ ] Keep source aliases where mapping confidence is medium/low.
- [x] Add doctrine notes for VLG-first gear tone, OGA-first relic consequence, and Gear Index-first item presentation.

## Acceptance Notes for API Conversion
- A referee should be able to run Chapter 05 without knowing D&D attack, save, or descending-AC math.
- A classic item or spell name may remain as a label, but its surrounding procedure must be SDM-native.
- Each converted module should resolve directly into SDM-facing object records and chapter-runnable item behavior.

## Acceptance Criteria

### A. Canonical Ownership
- Chapter 05 contains complete magic-item generation/adjudication procedure.
- Gear/Quickstart do not contain conflicting duplicate magic-item procedures.

### B. Runnable Procedure Quality
- Referee can run item generation and use handling from Chapter 05 without missing steps.
- Procedure order is explicit and consistent.
- Converted item families resolve into SDM-facing object records rather than naked RC results.

### C. Cross-Chapter Integrity
- Gear and Loot references to Chapter 05 anchors resolve.
- No stale links to retired headings or superseded sections.

### D. Compatibility Overlay Safety
- RC/BECMI-specific behaviors are clearly marked optional.
- Baseline SDM behavior remains coherent with overlays disabled.

## Validation Checklist
- [ ] Crosswalk completeness reviewed for all targeted magic-item families.
- [x] Phase B recognizer set seeded and reviewed in `_todo/BECMI/TODO_BECMI_Spell_Effect_Crosswalk.md`.
- [x] Phase B bridge batch 1 landed in Chapter 05 for deferred staff/ring recognizer bundles (`Staff of Elemental Power`, `Staff of Power`, `Staff of Wizardry`, `Spell Eating`, `Spell Storing`).
- [ ] Chapter 06 design decisions locked and Chapter 06 `alpha` status confirmed before new Chapter 05 batches.
- [ ] Chapter 05 flow run-through completed for at least 3 item families.
- [ ] Pointer integrity verified from Gear and Loot docs.
- [ ] Anchor/link check passes across touched markdown files.
- [ ] No baseline core-rule drift introduced in Quickstart.

## Forward Plan
1. Hold new Chapter 05 bridge edits while Chapter 06 powers design decisions are finalized and the chapter reaches `alpha`.
2. Resume Chapter 05 bridge rules for stored, delayed, absorbed, and reflected spell effects using the locked Chapter 06 API semantics.
3. Run the remaining Gear and Loot pointer/integrity checks once resumed bridge wording stabilizes.

## Backlog Items (deferred from Completeness Capture Epic)

### B1: RC Dispel Magic / Enchanted Vessel Procedure
- Source: `_becmi/extractions/rc_full.txt`, lines 18814–18833 (`Dispel Magic Attacks` section, RC Chapter 16 vessel rules).
- Content: Procedure for how Dispel Magic interacts with enchanted vessels and large constructs:
  - Frame-size check: vessel's entire frame must fit within the 20'×20'×20' dispel area; if not, no effect.
  - If it does fit and the dispel succeeds: non-permanent enchantments are completely dispelled; permanent enchantments go down for 1d10 rounds only.
  - Behavioral consequences: flying vessel begins to drop until the fly effect returns; submersible stops moving and begins to sink slowly, air goes stale.
- Deferral reason: this is a vessel/construct interaction rule; belongs in Chapter 05 magic-item adjudication lane, not the spell staging lane.
- Gate: Capture the whole capter/section, stage verbatim text here when Chapter 05 bridge batches resume (after Chapter 06 alpha).

### B2: Future Epic — Full Magical Items / Artifacts Corpus Extraction
- After the general metaphysics/world-ontology terms scan (planned as a follow-on to the Completeness Capture Epic), a dedicated Epic should target full-block or full-chapter extraction of all Magical Items and Artifacts text across the BECMI/RC corpus.
- Scope: all six extraction files (`basic`, `expert`, `companion`, `master`, `immortals`, `rc`), targeting:
  - Complete magic-item description blocks (generation tables, item behavior descriptions, creation procedures)
  - Artifact entries (powers, handicaps, penalties, penalties-on-destruction)
  - Construction and enchantment procedures (RC Chapter 16, Companion/Master demi-human crafts sections)
  - Interaction rules (Dispel Magic vs items, Anti-Magic vs items, cursed item removal, recharging)
- This is distinct from the spell completeness survey: the target is prose item-description blocks, not spell-name cross-references.
- Sequencing: after metaphysics terms scan; before or concurrent with F2 full crosswalk build.

## Current Wording Rules Locked by Phase A
- Use `attack`, `melee attack`, or explicit Defense targets instead of `attack roll`.
- Use SDM save language or Quickstart morale directly instead of mixed morale/resolve/reaction phrasing.
- Use neutral referee disposition language when controlled creatures are released and the outcome is situational.
- Preserve classic spell/effect names only as recognizers until the Phase B bridge assigns them explicit SDM `power` behavior.

## Dependencies and Coordination
- Depends on boundary lock in `_todo/ftls/TODO_SDM_Gear_Index_Master.md`.
- Must stay compatible with acceptance model in `_todo/ftls/TODO_Loot_Treasure_Conversion.md`.
- Must follow overlay standards in `_todo/BECMI/TODO_BECMI_Conversion.md`.

## Out of Scope
- Owning or redefining the full staged spell corpus itself; that work now belongs to the active spell-staging and spell-crosswalk phase feeding Chapter 06.
- Broad economy rebalance beyond magic-item procedure requirements.
- Domain play integration.
