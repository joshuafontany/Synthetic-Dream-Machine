# TODO: BECMI -> SDM+ Conversion Master

## Intent
Track BECMI/RC conversion work as optional overlays on top of the consolidated SDM base model.

Base model (locked):
- Core rules: `Synthetic_Dream_Machine_01_Quickstart.md`
- Gear/item/vehicle catalogs: `Synthetic_Dream_Machine_05_Gear_Index.md`

## Conversion Policy
- BECMI/RC procedures are compatibility overlays, not replacements for canonical SDM baseline.
- Any overlay must declare:
  - what baseline step it modifies,
  - whether it is optional,
  - how to disable it cleanly.

## Conversion Goals
1. Preserve recognizable BECMI/RC procedure identity where it improves play clarity.
2. Express converted procedures in SDM-native units, cadence, and chapter anchors.
3. Keep SDM baseline stable while allowing optional compatibility overlays.
4. Maintain runnable table-facing loops, not only conceptual crosswalk notes.
5. Minimize adjudication drift across sessions and referees.

## State of Play
- FTLS Chapter 05 has a stable object-procedure front end and working module scaffold.
- Numeric ontology is locked policy for active conversion work: BECMI level, HD, and spell-tier references already map to SDM `Level` and `Power Level`.
- Class locks and most D&D ability-score terminology have already been removed or reduced in active chapter conversion.
- Armor/shield Defense has been corrected from descending AC assumptions to SDM additive armor bonuses.
- The full staged spell corpus now exists across `_todo/BECMI/TODO_PRE_ADD_Spell_Staging.md` and the six `_todo/BECMI/TODO_BECMI_Spell_Material_Staging_*.md` files and feeds a live crosswalk workspace in `_todo/BECMI/TODO_BECMI_Spell_Effect_Crosswalk.md`.
- That crosswalk now has a flat canonical catalog, preserved cross-tradition class/spell tags, an SDM-first grouped module layer, and completed grouped-`partial` to Phase 1 sync.
- Method correction (2026-03-23): staging docs should contain scraped/curated source text from `_becmi` extraction, not synthesized context overlays.
- The Chapter 06 multi-witness `osr:` preservation import pass is complete (2026-04-01; 203/204 rows `osr: imported = yes`, 1 `[needs-review]`). Next gate: Ch06 alpha verification before Chapter 05 bridge work resumes.

## Execution Lock Snapshot (2026-03-28)

- **Staging corpus**: the staged lane docs (`_todo/BECMI/TODO_PRE_ADD_Spell_Staging.md` and the six BECMI lane files) are frozen as the legal upstream witness base, and the clean multi-witness staging file is the legal downstream Chapter 06 import source.
- **Confidence gate**: approved working infrastructure at `0.90 / 1.00` floor-based after the 2026-03-28 audit.
- **Chapter 06 design decisions**: locked.
- **Chapter 06 alpha**: `osr:` import pass complete (2026-04-01); alpha verification pending (tag consistency, overcharge consistency, recognizer discoverability, Level/Power Level boundaries).
- **Chapter 05 bridge batches**: remain paused until Chapter 06 `alpha` is complete.

## Uplift Execution Log (Consolidated)

- 2026-03-23 lane-harvest cleanup locked in: removed synthesized context inserts from staging docs, preserved source-evidence-only policy, and completed broad OCR/readability normalization across Companion/Master/RC evidence blocks.
- 2026-03-27 direct PDF audit re-rated the staged lanes against the paired `_becmi` sources and exposed four concrete regressions: Basic wrapper truncation, Companion MU body loss, Expert table survivability ambiguity, and Immortals late-alphabet truncation.
- 2026-03-27 pipeline hardening then landed in the lane builders and validators: shared OCR rescue was split into layered cleanup, Basic now hard-fails on Rope of Climbing continuation, Companion adds layout-column recovery for parser-hostile MU pages, Expert normalizes and validates research/treasure table survivability, and Immortals validates late-alphabet Section 3 witnesses. Current regenerated baseline: B 0.93, E 0.94, C 0.90, M 0.95, I 0.95, RC 0.94.
- Phase B bridge activation is in effect: Chapter 06 was prioritized first, then Chapter 05 bridge continuation.
- Chapter 06 alpha scaffolding and normalization completed in manuscript form: doctrine locks, card-template normalization, navigation indexing, provenance pointers, and baseline recognizer coverage were landed.
- 2026-03-25 Expert lane uplift completed: all Expert `undecided` rows were resolved via evidence-lock notes and status normalization.
- 2026-03-25 Companion lane uplift batch C1 executed: six C-lane rows were evidence-locked and promoted (`Earthquake`, `Insect Plague`, `Sword`, `Call Lightning`, `Control Temperature 10' radius`, `Faerie Fire`), reducing C-lane undecided from 13 to 7.- 2026-03-31 Pre-AD&D/Holmes pipeline hardening: `build_becmi_spell_staging_multi.py` was updated to include 11 Pre-AD&D/Holmes spells that were previously missing from the staging output. Staging file raised from 184 → 195 H2 entries; crosswalk Ch06 Import ✓ count raised from 193 → 204. Stub cards for all 11 new spells were added to Chapter 06; `import_ch06_osr.py` unblocked.
- 2026-04-01 Chapter 06 `osr:` import pass complete: 203/204 rows `osr: imported = yes`, 1 `[needs-review]` (`Finger of Death`). Phase B gating item resolved. Ch06 alpha verification is now the active gate.
## Lane Confidence Gate (B/E/C/M/I/RC)

Current baseline from the 2026-03-27 post-audit pipeline-hardening pass. These ratings now describe regenerated staging output, not just audit observations:

| Lane | Capture Confidence (spell/magic/metaphysics captured) | Provenance Complete | Target | Last Survey |
| --- | --- | --- | --- | --- |
| B | **0.93** | 1.00 | sustain 0.93; keep wrapper-tail validation green | 2026-03-27 |
| E | **0.94** | 1.00 | sustain 0.94; keep research/treasure table survivability green | 2026-03-27 |
| C | **0.90** | 1.00 | > 0.90 capture, continue targeted MU sixth-level recovery | 2026-03-27 |
| M | 0.95 | 1.00 | maintain 0.95, quality verified | 2026-03-27 |
| I | **0.95** | 1.00 | sustain 0.95; keep late-alphabet Section 3 witnesses green | 2026-03-27 |
| RC | 0.94 | 1.00 | maintain 0.94, recovery justified | 2026-03-27 |

**2026-03-27 Pipeline Results Summary**: The audit-discovered regressions were pushed back into the builders. Basic recovered the `Rope of Climbing` tail and now validates it explicitly. Expert now preserves the research-example tail row and hard-fails on malformed treasure-table continuity. Companion gained a layout-column recovery pass for parser-hostile MU 5th-7th description pages, recovering multiple missing spell bodies but still leaving some sixth-level work for a later pass. Immortals now stages late-alphabet Section 3 witnesses beyond `Maze`, including `Shapechange`, `Symbol`, `Teleport`, `Web`, and `Wish`. Provenance completeness remains at 1.00 across all lanes.

**Priority Recovery Items**:
1. Companion targeted sixth-level cleanup where parser hostility still prevents full body recovery
2. Ongoing OCR cleanup in high-friction lanes without loosening validation boundaries
3. Rollup and downstream consumers should inherit the regenerated baseline rather than the older audit-only penalties

Pipeline findings (2026-03-27):
- **B restored to 0.93:** the Basic builder now extracts past the old miscellaneous-item truncation and the validator checks the `Rope of Climbing` continuation explicitly.
- **E sustained at 0.94:** the Expert lane now keeps its bounded extraction, but the pipeline additionally normalizes the research-example tail row and validates table survivability instead of relying on broad chapter presence.
- **C raised to 0.90:** the Companion lane now includes an explicit layout-column recovery pass for parser-hostile MU pages, restoring multiple missing spell bodies while still documenting residual sixth-level recovery debt.
- **M confirmed at 0.95:** the Master procedures lane remains strong after direct PDF review. `Anti-Magic Effects`, `Dispel Magic`, non-human spellcasters, and the artifact witness run all remained materially intact in the audited samples.
- **I raised to 0.95:** the Immortals lane now extends Section 3 recovery beyond `Maze` and validates representative late-alphabet witnesses; residual drag is parser hostility, not a known N-Z truncation boundary.
- **RC adjusted to 0.94:** direct audit confirmed that the staged RC recoveries work, including Chapter 3, Prismatic Wall, spell doctrine, and the Chapter 16 item catalog. The score drops slightly because the source PDF is unusually hostile and the lane depends on targeted recovery more heavily than the old confidence prose acknowledged.

### Audit Ledger

| Lane | Audited section / gate | Extraction mode now in force | Known defect class | Fix status | Next rating gate |
| --- | --- | --- | --- | --- | --- |
| B | Higher-level guidance, lost spell books, scroll wrapper flow | longer wrapper extraction plus explicit Rope tail validation | OCR texture and wrapper readability | wrapper regression retired | keep wrapper-tail validation green before any score increase |
| E | Research/lost books; page 63-65 treasure run | bounded page-column extraction plus stronger table validation | local crop noise and OCR scars | table survivability hardened | tighten crop cleanup and remove residual page bleed to reach `0.95+` |
| C | MU 5th-9th run; scroll-to-misc flow | flow-first rebuild plus layout-column recovery on parser-hostile MU pages | residual sixth-level parser hostility and OCR noise | partial recovery landed | continue targeted sixth-level body recovery before any score increase |
| M | Anti-Magic / Dispel procedures; artifact witnesses | procedure extraction plus Master validator | dense artifact witness prose | validator landed | split any remaining over-broad witnesses only if auditability regresses |
| I | PP recovery / bias context; full Section 3 override run | extracted Sections 1-2 plus extended validated slice fallback for Section 3 | chart-heavy parser hostility in Section 3 | late-alphabet recovery landed | reduce slice-fallback burden before considering `0.96+` |
| RC | Chapter 3, Prismatic Wall, monster spellcasters, Chapter 16 catalog | targeted recovery plus RC validator | bespoke recovery burden on hostile PDF pages | validator landed | replace the heaviest bespoke recoveries with reusable primitives before any score increase |


### >0.95 Capture Uplift Plan (Context Harvest First)

Goal of this uplift phase: raise capture confidence by scraping and cleaning missing context, not by making final conversion decisions yet.

Common context products required for every lane (`B/E/C/M/I/RC`):
- `Missing Context Queue`: one line per row listing what is missing (trigger, limits, duration, target class, exception cases, reverse form behavior, failure mode).
- `Alias and Naming Registry`: canonical name, source spellings, reverse names, and index variants (no mechanical judgement yet).
- `Procedure Skeleton Extracts`: neutral paraphrase blocks per row (`when used`, `what it affects`, `what stops it`, `how it ends`).
- `Edge-Case Index`: explicit collection of caveats (object interactions, planar exceptions, anti-magic interactions, concentration breaks, permanence rules).
- `Source Evidence Pointer`: per-row citation pointers already present in Phase 1, verified and cleaned for readability.

1. **B lane (0.93 -> >0.95)**
  - Keep the wrapper-tail validator and extraction window stable.
  - Limit further work to OCR cleanup and compact context extracts; do not reopen the wrapper regression.

2. **E lane (0.94 -> >0.95)**
  - Harvest missing context from high-tier Expert rows (illusion walls, kill/destruction, polymorph and anti-magic boundary behavior).
  - Build an `ECM context packet` (what blocks/reflects/suppresses and under what conditions) without selecting final SDM implementation.

3. **C lane (0.90 -> >0.95)**
  - The broad MU regression is partially retired by the new layout-column recovery pass; remaining work is now narrower and concentrated in parser-hostile sixth-level bodies.
  - Next Companion uplift step: add one more targeted recovery pass for the remaining sixth-level entries and then review wording deltas versus RC.
  - Secondary: continue cleanup of ring/staff/rod/misc extracts into reusable neutral templates that downstream conversion can map later.

4. **M lane (0.95 -> >0.95)**
  - Master Procedures extraction gap is now closed: `Anti-Magic Effects` and `Dispel Magic` are staged in the Master lane.
  - Remaining Master work is cleanup-focused: normalize residual OCR texture in the new procedure block and keep neutral extract formatting consistent.
  - Optional follow-up: compare Master procedure wording against RC/Companion parallels to flag doctrinal deltas for later conversion notes.

5. **I lane (0.95 -> sustain)**
  - Keep cleanup focused on OCR/line-wrap normalization while preserving source meaning.
  - Use the extended Section 3 recovery when deriving downstream power-cost, override, and regeneration doctrine notes.

6. **RC lane (0.95 -> sustain)**
  - Keep OCR/line-wrap cleanup focused on readability only; do not mutate source meaning.
  - Cross-compare RC item-property wording against B/E/C/M analogs and capture doctrinal deltas for downstream conversion notes.

### Execution Rules For Context-First Uplift

- This phase captures and cleans context only; conversion design choices are deferred to implementation passes.
- Confidence lift is earned by shrinking the `Missing Context Queue`, not by forcing mapping statuses.
- Provenance must remain at `1.00`; any source/staging drift blocks lane sign-off.
- For OCR-heavy or layout-dense pages, render page PNGs first and curate against the image plus extracted text before writing staging updates. Preferred helper: `_todo/BECMI/scripts/render_becmi_pages_png.sh`.
- Store rendered page images under `_todo/_page_renders/.cache/<lane>/` and keep page numbers in the filename for source-traceability.
- Sequence rule: complete lane staging evidence harvest first (scrape + clean missing context from PDFs), then run crosswalk updates as a follow-up pass.
- During this phase, avoid crosswalk status churn unless needed to fix provenance pointer breakage.
- Lane sign-off for this phase requires:
  - all rows have a context completeness check,
  - all missing-context items are either resolved or explicitly queued,
  - alias/reverse/index variants are normalized,
  - edge-case extracts are present for high-risk rows.

## API Conversion Doctrine

### Preserve External Recognizers
- Preserve classic item names.
- Preserve classic spell and effect names when they function as familiar API labels.
- Preserve familiar module labels and classic subtable names where they aid lookup.
- Treat preserved BECMI-facing names as labels and recognizers, not mechanical authority.

### Replace Internal Mechanics
- `AC` and descending defense become additive `Armor` and `Defense`.
- `hit points` become `Life`.
- Class restrictions become Traits, practices, bearer requirements, or gear-compatibility limits.
- Spell tiers become `Power Level`.
- Character/caster level and monster `HD` become SDM `Level`.
- Attack and save math become SDM roll language, save language, and `[+]` / `[-]`.

### Canonical Reference Order
- `Synthetic_Dream_Machine_01_Quickstart.md` controls core rules truth.
- `Synthetic_Dream_Machine_05_Gear_Index.md` controls item math and presentation.
- `Synthetic_Dream_Machine_04_Powers_Index.md` controls power-facing storage and trigger language.
- `Synthetic_Dream_Machine_03_Traits_Index.md` informs classless identity replacements.
- `Synthetic_Dream_Machine_06_Campaign_Regions.md` only applies when region/faction/world-process context matters.
- `Vastlands_Guidebook`, `Our_Golden_Age`, and `Ultraviolet_Grasslands_and_the_Black_City_2e` are style guides, not mechanical canon.

## Conversion Standards
- Canon first:
  - Quickstart/Gear canon is the baseline; overlays must not redefine core rules.
- Procedure shape preservation:
  - Keep trigger -> procedure -> output -> consequence structure explicit.
- Unit consistency:
  - Use canonical SDM value/carry units unless an overlay explicitly states a conversion mode.
- Reversibility:
  - Every overlay can be disabled without breaking baseline procedures.
- Traceability:
  - Each conversion note should reference its canonical SDM destination anchor.

## Alignment Constants (Locked)
- Character and caster level scaling: convert BECMI character/caster levels to SDM `Level` by halving and always rounding up.
- Hit-Dice scaling: convert BECMI `HD` creature potency to SDM `Level` by halving and always rounding up. This is separate from SDM `Hero Dice (HD)`.
- Spell-to-power scaling: `Spell Level x2 = SDM Power Level`; cantrips and other minor at-will or `x/day` free effects map to `Power Level 1`.
- Manuscript presentation policy: Chapter-facing text should be `SDM only`; source reference values stay in TODO/reference notes, not inline in the manuscript.

## Numeric Ontology Reference
- Use `Level` for entity potency, caster potency, summon strength, curse removal strength, dispelling strength, and other force-of-source references.
- Use `Power Level` for spell-tier storage, eligibility, archive capacity, and any direct spell-to-power conversion.
- Use `Level` thresholds for converted creature filters and control limits.
- Examples:
  - `3 HD -> Level 2`
  - `7 HD -> Level 4`
  - `15 HD -> Level 8`
  - `26th level caster -> Level 13 practitioner`
  - `36th level cleric -> Level 18 holy practitioner`
  - `1st-level spell -> Power Level 2`
  - `4th-level spell -> Power Level 8`
  - `cantrip/minor at-will or x/day effect -> Power Level 1`

## Shared Phase Tracker

### Phase A: Mechanical Resolution Cleanup
- Remove hidden D&D math while preserving classic names and labels.
- Convert save language, attack math, morale/reaction references, and source-era combat modifiers into SDM-native resolution.
- Use this phase to eliminate remaining descending-AC-era logic and disguised THAC0 assumptions.

### Phase B: Power / Spell API Bridge
- Preserve classic spell-item names while routing internal behavior through SDM `power` concepts.
- Apply `Power Level` for storage, eligibility, and capacity.
- Apply `Level` for force-of-source, dispel/counterforce, summon strength, and curse-removal strength.
- Record ambiguous classic spell names in TODO notes rather than leaving them implicit in chapter prose.
- Phase B execution order is locked for this pass: Chapter 06 design decisions -> Chapter 06 alpha completion -> Chapter 05 bridge continuation.
- Phase B operational queue source: `_todo/BECMI/TODO_BECMI_Spell_Effect_Crosswalk.md -> Phase B Backlog: Chapter 06 osr: Import`.
- Phase B Chapter 06 import pipeline is now two-step: regenerate `_todo/BECMI/TODO_BECMI_Spell_Material_Staging.md`, then import those witness bundles into `Flying_Triremes_and_Laser_Swords_06_Powers_and_ECM.md`.

### Phase C: module-by-module Internal Conversion
- Convert item families in a fixed order:
  1. Potions / Oils / Elixirs
  2. Scrolls / Formulae / Map-Documents
  3. Wands / Staves / Rods
  4. Rings / Amulets / Charms
  5. Miscellaneous Items / Strange Items / Oddities
  6. Armor / Shields / Wards
  7. Missile Weapons / Missiles
  8. Swords
  9. Miscellaneous Weapons
- Standardize trigger model, bearer requirements, resolution language, damage/Defense/save scale, status/control effects, depletion/failure model, and output record.

### Phase D: Back-Half System Conversion
- Convert salvage/building/modding formulas to SDM-native units and procedures.
- Convert archives/albums/grimoires to SDM-native storage and activation language aligned to Gear and Powers.
- Remove remaining chapter-facing BECMI economy and slot assumptions.

### Phase E: Final Consistency and Acceptance Pass
- Run final manuscript verification for forbidden mechanics terms and inconsistent SDM terminology.
- Verify preserved BECMI labels no longer carry BECMI internal mechanics.
- Sync accepted policy and any deliberate exceptions back into linked TODOs.

## Other Pass

## Active Linked TODOs
- Loot/Treasure stabilized plan:
  - `_todo/ftls/TODO_Loot_Treasure_Conversion.md`
- Magitech Chapter 05 alignment:
  - `_todo/ftls/TODO_Magitech_Fantascience_Chapter05.md`
- SDM consolidation master:
  - `_todo/ftls/TODO_SDM_Gear_Index_Master.md`


## Active Focus

> **ON FIRE — start here.** This section identifies the single next action for this pipeline. Read before touching any other queue item.

### [DONE 2026-04-03] Void Module: Doctrine Sub-module Reorganization

Confirmed complete on inspection (2026-04-03): the `Traversal and Passage` sub-module no longer exists in `Battle, Elements, and Force`; all portal/teleport rows (Dimension Door, Magic Door, Pass Plant, Passwall, Plant Door, Teleport, Teleport any Object, Transport Through Plants, Travel, Word of Recall) are in `Light and Void → Void` migration table; Gate is in Void table (not Summoning); Void doctrine describes void transit as primary scope with no "reserved stub" language remaining. No further action needed.

---

### Ch06 Alpha Verification — SPRINT IN PROGRESS

**Task:** Run a structured alpha pass over `ftls/Flying_Triremes_and_Laser_Swords_06_Powers_and_ECM.md` verifying tag consistency, overcharge consistency, recognizer discoverability, and Level/Power Level boundaries across all 196 power cards.

**Gate:** This is the prerequisite for marking Ch06 `alpha` complete (queue item #5), which in turn gates Ch05 Phase B bridge resumption and the F2 Magic Items pass.

**Verification targets (per card):**
- `[tags]` match the module taxonomy in `TODO_BECMI_Spell_Effect_Conversion_Doctrine.md` — no orphan tags, no missing mandatory tags
- `overcharge:` blocks present on all cards with multi-tier effects; absent only where explicitly not applicable
- `osr:` recognizer line uses the canonical Classic Name or a documented alias (not a paraphrase)
- `p:` (Power Level) satisfies `Spell Level × 2` scaling rule; any deviation is explicitly documented
- Cards requiring `[dangerous]` (P: 12+ or no-save instant kill) carry the tag

**Scope:** All 196 cards in Ch06. Strategy: spot-check the module sections in doctrinal order (Battle/Force → Biomancy → ECM → Summoning → Deathless → Psychic Warfare → Knowledge → Alchemy → Light/Void), flagging non-conforming cards for follow-up batch edits.

**Ch05 structural work note:** Ch05 also needs structural reorganization (power-card and section layout) before the full SDM+OSR source import and conversion/synthesis pass. This is a distinct gate from the OSR power-text import pass; do not conflate.

---

### Sprint: Ch06 Alpha Verification — 2026-04-03+

Sprint opened after osr: import pass complete. Gate items below tracked as P0/P1/P2 stories with tasked spirits.

---

#### P0 — Epic: Reorganize Ch06 structure to match Conversion_Doctrine modules

**Status: NOT STARTED**

The Conversion Doctrine (`TODO_BECMI_Spell_Effect_Conversion_Doctrine.md → ## Power Modules`) now defines the canonical module architecture for Chapter 06. Ch06's current section headers and card groupings do not match this architecture. This epic restructures the chapter so that each module's H2/H3 headings, the chapter index, and the power cards themselves are organized per doctrine.

**Canonical module list (from Doctrine `## Power Modules` and `## Procedural Modules`):**

*Power Modules (10):*

1. **Mana, Counterspells, and Jamming** — sub-modules: Mana | Counterspells and Jamming
2. **Battle, Elements, and Force** — sub-modules: Force | Elemental Fire | Elemental Ice/Cold | Elemental Earth | Elemental Air/Weather | Elemental Water | Demolition/Entropy | Atmospheric Hazards
3. **Biomancy** — sub-modules: Acute Medical Care | Systemic Treatment | Life Support/Metabolic Sustenance | Biotic Augmentation | Sensory Augmentation | Faerie Bodycrafts
4. **Illusion and Glamour** — sub-modules: Counter-Veil | Personal Veil | Constructed Illusion | Sound Crafting | Self-State
5. **Summoning and Binding** — sub-modules: Summoning | Covenant and Binding
6. **Rites of the Deathless** — sub-modules: Resurrection | Ka Restoration | Deathless Communication | Corpse Fabrication | Undead Command
7. **Psychic Warfare** — sub-modules: Fear and Morale | Mental Destruction | Mind Transfer and Storage | Noospheric Defense | Compulsion and Oath | Charm
8. **Knowledge and Oracle** — sub-modules: Archive Access | Object and Mind Interrogation | Oracle and Divination | Signal and Attunement | Detection and Analysis
9. **Alchemy and Artifice** — sub-modules: Brews and Consumables | Inscribed Items and Devices | Fabrication and Artifact Craft
10. **Light and Void** — sub-modules: Radiance | Shadow | Prismatic | Void

*Procedural Modules (3):*

11. **ECM – Etheric Counter-Magitech**
12. **Ritual Mechanics — Cross-Module Procedures**
13. **Immortal Metaphysics**

**Stories (for tasked spirits):**

- `Arch(ChapterMap)` — inventory current Ch06 H2/H3 structure and map each existing section to its target doctrine module. Flag orphaned cards (no clear module home). Escalates to `Ink-Clerk (Lorekeeper)`.
- `Arch(IndexRebuild)` — rewrite the Chapter 06 index to reflect the new module structure with correct anchor links. Escalates to `Lares (Artificer)`.
- `Arch(SectionRewire)` — move power cards into correct module sections. Operates in passes; each pass covers one doctrine module. Escalates completion of each pass to `Lares (Gatekeeper)`.
- `Arch(AnchorAudit)` — after SectionRewire, verify all `<a id>` anchors and back-links resolve correctly. Escalates to `Breach-Watch (Triage)`.

**Acceptance criteria:** `diff --unified` of heading structure shows all 13 module headers present; Python card-count audit confirms 196+38 = 234 divs; no broken anchor links; index matches actual card positions.

---

#### P1 — Stories (Ch06 Alpha Verification — gap closure)

| ID | Status | Story | Tasked Spirit |
|---|---|---|---|
| S1 | **DONE 2026-04-03** | Seed P: values on all 196 OSR pending stubs from crosswalk `Class(es)/Spell-level` column (`max(1, min_level × 2)`) | `AnnP(Annotator)` (done; `_todo/BECMI/scripts/annotate_ch06_p_levels.py` created, fixed, and run: 195 cards annotated) |
| S2 | **DONE 2026-04-03** | Migrate all `[high-tier]` tags: replace with `[dangerous]` where P:≥12 or editorial-[dangerous] call; remove where P:<12 utility | `TierShift(Migrator)` (done; 59 REPLACE→dangerous, 2 existing [dangerous] stripped, 3 remove-only: Commune / Pass Plant / Truesight) |
| S3 | **DONE 2026-04-03** | Finger of Death: accept synthesized `osr:` block (Gap 3); add tags `[necromancy] [dangerous] [death] [deathly] [attack]`; P: 10 seeded by S1 | `GapFix(Annotator)` (done; crosswalk `osr: imported = yes` confirmed) |
| S4 | **DONE 2026-04-03** | Reckless Dweomer: seat corrected burden → trait | `GapFix(Annotator)` (done) |
| S5 | **CLOSED 2026-08-12** | Storage seating carries no ms tag — the manuscripts hold no `[storage:*]` layer; seat contracts live in the `bags/@sdm` mount-points. BECMI default seat stays trait (Doctrine F.6); item seats arrive as Ch05 variant-card work | `StoreFix(Migrator)` (closed) |
| S6 | **TODO** | Shield Ward manual P: assignment — card not in crosswalk; determine correct P: from FTLS design intent and set explicitly | `Lares (Council)` |
| S7 | **TODO** | osr: recognizer sweep — run `import_ch06_osr.py check` and verify `drift: no`; ensure all recognizer lines use exact canonical Classic Name or documented alias | `DriftWatch [task[Continuity]]` → escalates to `Ink-Clerk (Lorekeeper)` |

---

#### P2 — Native card audit and module taxonomy

| ID | Status | Story | Tasked Spirit |
|---|---|---|---|
| N1 | **TODO** | Audit the 38 native FTLS cards (non-pending): verify P: values, tag completeness, overcharge blocks present where warranted | `NativeAudit(QA)` → escalates to `Lares (Scryer)` |
| N2 | **TODO** | Module taxonomy card-by-card sweep: every card carries correct module tag(s) per Doctrine taxonomy (e.g. `[battle]`, `[biomancy]`, `[ecm]`, `[summoning]`, `[deathless]`, `[ritual]`) | `TaxClerk(Continuity)` → escalates to `Ink-Clerk (Lorekeeper)` |

---

#### Bugs (sprint — identified and resolved 2026-04-03)

- **`annotate_ch06_p_levels.py` produced silent output (exit 0)**: missing `if __name__ == "__main__": main()` entrypoint — fixed.
- **`CLASS_LEVEL_RE` matched only uppercase letters**: failed on `Dr3` (Druid) class codes; fixed to `[A-Za-z]+(\d+)`.
- **`seen` set dedup blocked RC-only exception rows from being overridden**: RC-only exception table (rows 82–89) appears before the real spell catalog; `seen` was marked on first encounter including non-numeric entries, preventing catalog rows from updating the P: map; fixed to only add to `seen` on numeric resolution.

---

#### Spikes (open questions — needs operator ruling)

- **S6 spike — Shield Ward P: determination**: `Shield Ward` is a native FTLS card with no BECMI crosswalk entry. P: needs to be established from FTLS design intent (recommended: compare to analogous BCM `Shield` / `Protec. from Normal Missiles` / Ward-type spells as a baseline). Operator ruling needed before S6 closes.
- **P:<12 editorial [dangerous] calls (first pass)**: Polymorph Others (P:8, permanent-transform save), Conjure Elemental (P:10, creature can kill caster), Dispel Evil (P:10, banishes/destroys), Magic Jar (P:10, soul displacement), Quest (P:10, permanent magical compulsion) were tagged `[dangerous]` on editorial grounds this sprint. These are first-pass calls; card body conversion pass (Pass 3) may revise.
- **Commune, Pass Plant, Truesight**: `[high-tier]` removed; no `[dangerous]` added. First-pass call: these are utility/divination effects without dangerous outputs at their P: tier. Revisit at N1.

---

## Active Queue
1. [DONE 2026-04-01] **Add Chapter 06 stub cards for 11 new Pre-AD&D/Holmes spells** — all 11 cards added; `import_ch06_osr.py` unblocked.
2. Keep the spell/effect crosswalk in lockstep: Chapter 06 `osr:` import-state changes must be mirrored back into the flat catalog immediately.
3. [DONE 2026-04-01; verified 196/196 drift:no 2026-04-03] **Execute the Chapter 06 spell-only `osr:` preservation import pass** — 196/196 `osr: imported = yes`; `import_ch06_osr.py check` → `drift: no`; `audit_crosswalk_source_completeness.py` → 0 candidates.
4. Run Chapter 06 alpha verification after the preservation import pass (tag consistency, overcharge consistency, recognizer discoverability, Level/Power Level boundaries).
5. Mark Chapter 06 as `alpha` complete before resuming new Chapter 05 bridge edits.
6. Resume Chapter 05 Phase B bridge batches with the now-locked Chapter 06 API doctrine.
7. Re-validate overlay assumptions against current Quickstart/Gear canon as downstream manuscript edits resume.

## Activities Checklist
- [ ] Build/refresh BECMI -> SDM crosswalk index by subsystem (`B/E/C/M/I` lanes).
- [ ] Add short procedure excerpts (paraphrase + source refs) for each active overlay lane.
- [ ] Draft `Siege-as-Dungeon` procedure in FTLS format (watch-based).
- [ ] Draft `Immortal/Spheres in SDM+` reference page (factional physics + world-process play).
- [ ] Reconcile `I03` overlay interaction rules with `C04` nexus update procedure.
- [ ] Validate each overlay against current Quickstart/Gear anchors.
- [ ] Mark each overlay as optional/default-off/default-on explicitly.
- [ ] Add disable-path note for each overlay (how to revert to pure SDM baseline).
- [ ] Run at least one table-walkthrough per overlay module (discovery, combat, economy, progression).
- [x] Record identified drift/ambiguity points and patch target TODOs.
- [ ] Sync accepted overlay decisions into linked TODOs (`Loot`, `Magitech`, `SDM consolidation master`).

## Future TODO Passes

### F1: Spells -> Powers
- [x] Treat `_todo/BECMI/TODO_BECMI_Spell_Material_Staging.md` as the canonical staged spell corpus for this pass.
- [x] Preserve canonical OSR spell names as the primary crosswalk row keys and Chapter 06 lookup surface.
- [x] Record existing stylized entries from `Synthetic_Dream_Machine_04_Powers_Index.md` as named SDM variants with `see` handling, not as replacements for canonical spell names.
- [x] Define fallback policy for unmatched spells (`direct map`, `partial map`, `custom power required`, `undecided`).
- [ ] Deepen the spell-pattern crosswalk from status tagging into chapter-ready SDM Powers doctrine.
- [ ] Apply locked scaling constants (`Spell Level x2 = SDM Power Level`; cantrip floor).
- [ ] Define conversion rules for range/duration/targeting in SDM procedure language.
- [ ] Use the manuscript pattern `canonical spell first, variant callout second` whenever a Luka-style descendant already exists (for example: `Magic Missile` -> `see Tragic Missile`).
- [ ] Route outputs to canonical powers destinations and quick-reference anchors.
- [ ] Use FTLS Chapter 06 as the first major destination chapter for the full staged spell corpus and crosswalk outputs.
- [ ] Add validation scenario set:
  - direct attack/control,
  - utility/exploration,
  - summon/transform/exception cases.
- [ ] Add relationship notes for likely combined-power / overcharge families where several classic spells may collapse into one SDM progression.
- [ ] Mark likely locked-rider families where higher Overcharge effects should require RSS, archive, corruption-cleaning, or other campaign-side unlock work before safe use.
- [x] Lock final Chapter 06 design decisions into chapter doctrine and supporting TODO notes.
- [ ] Mark Chapter 06 as `alpha` complete before promoting additional Chapter 05 bridge batches.

### F2: Magic Items -> Magitech and Fantascience
- Queue policy: begin or resume this pass only after Chapter 06 reaches `alpha` state.
- [ ] Build module-by-module crosswalk (`RC/BECMI magic item families` -> `SDM magitech/fantascience lanes`).
- [ ] Keep procedure conversion separate from terminology conversion (mechanics first, naming pass second).
- [ ] Route converted generation flow to Chapter 05 canonical anchors.
- [ ] Define compatibility tags for source behaviors where direct SDM mappings are partial.
- [ ] Validate loot handoff integrity (`treasure yield -> item generation -> use/constraints`).
- [ ] Add acceptance test set:
  - permanent item path,
  - consumable/charged item path,
  - cursed/complication-bearing item path.
- [ ] Use Chapter 05 armor/shield conversion as the model pattern for `retain BECMI API surface, replace internal mechanics`.
- **Pre-F2 upstream Epic (planned):** After the metaphysics/world-ontology terms scan (follow-on to the Completeness Capture Epic), run a dedicated full-text extraction Epic targeting all Magical Items and Artifacts blocks across the BECMI/RC corpus. This Epic feeds F2 with source-evidence anchors rather than relying on spell completeness cross-references alone. See `_todo/ftls/TODO_Magitech_Fantascience_Chapter05.md -> Backlog Items -> B2` for scope detail.
- **Backlogged RC procedure:** RC `Dispel Magic Attacks` / enchanted vessel interaction rule (rc_full.txt L18814–18833) is deferred to Chapter 05 and tracked at `_todo/ftls/TODO_Magitech_Fantascience_Chapter05.md -> Backlog Items -> B1`.
  

### Other Passes
- `C03` Agent/retainer reliability + delegation canonicalization.
- `B05` Unified zoom handoff matrix (round/turn/watch/week/month).
- `I02` Sphere-like factional physics normalization.
- `M02` Siege logic canonicalization.

## Future Pass Standards
- Future passes must not redefine Quickstart core mechanics.
- Future passes must preserve optional-overlay toggles and disable paths.
- Future pass outputs must include explicit canonical SDM anchor references.

## Done Criteria
- Overlay work references canonical SDM anchors, not superseded chapter structures.
- Overlay toggles are explicit and local (no global ambiguity).
- Loot/magic-item overlays remain compatible with consolidated Quickstart+Gear model.
