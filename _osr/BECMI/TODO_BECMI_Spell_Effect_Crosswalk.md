# TODO: BECMI Spell / Effect Crosswalk

This document is the downstream handoff artifact for the completed BECMI spell-material staging corpus.

Purpose:
- track classic spell and effect names across the staged core books
- build the full canonical spell crosswalk from the staged corpus
- support FTLS Chapter 06 powers drafting as the next major downstream consumer
- support the broader `Spells -> Powers` conversion pass

Source corpus:
- `_todo/BECMI/TODO_PRE_ADD_Spell_Staging.md`
- `_todo/BECMI/TODO_BECMI_Spell_Material_Staging_Basic.md`
- `_todo/BECMI/TODO_BECMI_Spell_Material_Staging_Expert.md`
- `_todo/BECMI/TODO_BECMI_Spell_Material_Staging_Companion.md`
- `_todo/BECMI/TODO_BECMI_Spell_Material_Staging_Master.md`
- `_todo/BECMI/TODO_BECMI_Spell_Material_Staging_Immortals.md`
- `_todo/BECMI/TODO_BECMI_Spell_Material_Staging_Rules_Cyclopedia.md`

Rules for this artifact:
- This is a crosswalk workspace, not a source-text staging file.
- Use the staged corpus as the source of truth; do not copy from PDFs ad hoc.
- Preserve classic names as lookup keys.
- Do not convert terminology to SDM terms until a mapping decision is recorded.
- Preserve classic OSR spell names as the primary Chapter 06 headings and lookup surface even when an SDM-native variant already exists.
- Creature-specific spellcaster scans remain out of scope unless they are required to clarify the spell corpus itself.

## Provenance Contract

- Treat provenance as a required field of the crosswalk, not optional supporting note quality.
- For most spell rows, the minimum acceptable source shape is **2+ sources**:
	- one pre-`RC` BECMI source lane (`Basic`, `Expert`, `Companion`, `Master`, or `Immortals`) when evidenced in the staged corpus
	- one `RC` source anchor when the spell or effect appears in the Rules Cyclopedia staging lane
- Express that pairing explicitly in both provenance-facing columns:
	- `Source Book(s)` should normally show the pre-`RC` lane plus `RC`
	- `Staging Anchor / Section` should normally show both the pre-`RC` anchor and the `RC -> ...` anchor
- `RC` is the canonical compendium lookup surface, but it is not a license to drop earlier BECMI evidence when that evidence exists.
- `RC`-only rows are allowed only when the staged corpus currently shows no earlier evidenced BECMI source. Treat those rows as **exception state**, not baseline completion.
- If a row has a pre-`RC` BECMI source but no `RC` source, treat that as incomplete provenance unless the row is explicitly out of RC scope.
- If a row has `RC` plus multiple pre-`RC` lanes, keep the earliest evidenced lane and any semantically important later lane(s); do not over-minimize provenance down to a single BECMI witness if later BECMI lanes materially change wording, scaling, or reverse-form handling.
- Chapter 05 and Chapter 06 downstream exports should inherit this doctrine: prefer paired provenance (`becmi:<lane>` plus `becmi:Rules Cyclopedia`) whenever both are evidenced.

### Basic Book Split — Provenance Architecture Note

The Basic Set (`TSR 1011B`) splits spell content across two booklets with different audiences:

- **Player's Manual** (Basic staging anchor `Spell Lists and Basic Spell Descriptions`): covers 1st-level cleric spells (Cure Light Wounds through Resist Cold) and 1st- and 2nd-level magic-user spells (Charm Person through Wizard Lock), all with full descriptions. This is the primary `Basic` anchor for all rows in `### B - Basic`.
- **DM's Book** (Basic staging anchor `Higher Level Spells, Magic-User Spell Allocation, and Lost Spell Books`): covers 2nd-level cleric spells (Bless, Hold Person, Silence 15' Radius) and 3rd-level magic-user spells (Dispel Magic, Fire Ball, Fly) with full descriptions. These are presented as NPC reference material only, not player-accessible at Basic levels.

**Provenance consequences:**
- The 5 DM-book spells (Bless, Hold Person, Silence 15' Radius, Dispel Magic, Fly) predate their Expert exposure — their `Basic` source has been added to those Expert-section rows with the correct DM-book anchor.
- Fire Ball's `Basic` anchor was corrected from `Spell Lists and Basic Spell Descriptions` (wrong — Player's book page 35 only covers MU1–2) to `Higher Level Spells, Magic-User Spell Allocation, and Lost Spell Books`.
- **Provenance uplift complete (2026-03-30)**: The 12 MU2 spells formerly in the Expert arcane section without a Basic lane (Continual Light, Detect Invisible, ESP, Invisibility, Knock, Levitate, Mirror Image, Phantasmal Force, Web, Wizard Lock, Dispel Magic, plus Detect Evil) have been uplifted to `Basic, Expert, RC` with the anchor `Basic -> Spell Lists and Basic Spell Descriptions -> Magic-User Spells: Second Level`. This was a known provenance gap; it is now resolved. Pipeline verification (2026-04-02): `audit_crosswalk_source_completeness.py` returns 0 candidates and 196/196 staging rows show `missing expected witness lanes: none`.

## State of Play

- Confidence audit re-rated **0.95 / 1.00 (High Confidence)** as of 2026-04-02 — upgraded from 0.90 following import pass completion and pipeline audit.
- The staged spell corpus remains source-frozen and is the only legal witness set for Chapter 06 `osr:` imports.
- Chapter 06 design decisions are locked; Chapter 06 `alpha` is still open.
- The literal `osr:` import pass is **complete**: all 196 spell recognizer rows are marked `osr: imported = yes`; `import_ch06_osr.py check` confirms `drift: no`.
- Chapter 05 bridge continuation remains paused until Chapter 06 reaches `alpha`.
- Next operational step: Pass 3 — convert `osr:` references into SDM-native Chapter 06 rules text, power by power.

## Execution Lock Snapshot (2026-04-02)

- **Source lock**: open and frozen on the staged spell source set: the consolidated pre-AD&D staging file plus the six BECMI lane files.
- **Confidence lock**: open at **High Confidence (0.95 / 1.00)** — upgraded from 0.90 following 2026-04-02 audit.
- **Exception lock**: all 12 verified exception rows remain in force pending new evidence.
- **Chapter 06 design lock**: open; activation/payment/storage/overcharge/scale doctrine is already locked.
- **Chapter 06 osr: import lock**: complete — 196/196 spell recognizer rows imported, `drift: no`.
- **Chapter 06 alpha gate**: still closed; Pass 3 SDM conversion is part of the remaining alpha work.
- **Chapter 05 bridge gate**: closed until Chapter 06 `alpha` is complete.

## Exception State Ledger

This table is the canonical record of all verified exception-state rows. Updated each time provenance uplift work is performed.

Interpretation: `Confirmed RC-only` means all five pre-RC staging files (Basic, Expert, Companion, Master, Immortals) were searched and no standalone spell witness was found. `Confirmed Master-only` means no RC procedure witness was found in the RC staging file. Both statuses were verified 2026-03-26 during the Phase 1 provenance ledger pass.

| Row | Exception Class | Pre-RC Witness Status | Evidence Checked Date | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Analyze | RC-only spell | Confirmed RC-only | 2026-03-26 | Keep as RC-only exception | Search of B/E/C/M/I staging files returned no standalone spell witness. Low-tier MU1 analysis utility not evidenced in pre-RC lanes. |
| Entangle | RC-only spell | Confirmed RC-only | 2026-03-26 | Keep as RC-only exception | Search returned one hit in Master staging (line 3052–3053) describing an artifact trap mechanism, not a standalone arcane spell. No spell witness. |
| Create Air | RC-only spell | Confirmed RC-only | 2026-03-26 | Keep as RC-only exception | No pre-RC spell witness found. Environmental survival entry appears only in RC arcane spell list. |
| Clothform | RC-only spell | Confirmed RC-only | 2026-03-26 | Keep as RC-only exception | No pre-RC spell witness found. Form-spell suite (Cloth/Stone/Wood/Iron/Steelform) appears to have been introduced at the RC compendium stage. |
| Stoneform | RC-only spell | Confirmed RC-only | 2026-03-26 | Keep as RC-only exception | No pre-RC spell witness found. Part of RC-introduced form-spell suite. |
| Woodform | RC-only spell | Confirmed RC-only | 2026-03-26 | Keep as RC-only exception | No pre-RC spell witness found. Part of RC-introduced form-spell suite. |
| Ironform | RC-only spell | Confirmed RC-only | 2026-03-26 | Keep as RC-only exception | No pre-RC spell witness found. Part of RC-introduced form-spell suite. |
| Steelform | RC-only spell | Confirmed RC-only | 2026-03-26 | Keep as RC-only exception | No pre-RC spell witness found. Advanced form-spell variant in RC-introduced suite. |
| Artifact Activation | Master-only procedure | Confirmed Master-only | 2026-03-26 | Keep as Master-only exception | Attunement/discovery doctrine. RC staging does not contain a structurally equivalent standalone procedure witness. |
| Artifact Charges And Recharge | Master-only procedure | Confirmed Master-only | 2026-03-26 | Keep as Master-only exception | Magnitude-reserve doctrine. RC staging does not contain a structurally equivalent standalone procedure witness. |
| Artifact Intelligence And Auto-Defense | Master-only procedure | Confirmed Master-only | 2026-03-26 | Keep as Master-only exception | Autonomous agency doctrine. RC staging does not contain a structurally equivalent standalone procedure witness. |
| Creating Artifacts | Master-only procedure | Confirmed Master-only | 2026-03-26 | Keep as Master-only exception | Design workflow procedure. RC staging does not contain a structurally equivalent standalone procedure witness. |

## Metadata Scrape Confidence (2026-04-02 sync)

- Scope: the metadata scrape pass is evaluated as a separate layer from provenance; both layers are now fully verified and the import pass is complete. The score reflects post-import readiness for Pass 3 conversion.
- Interpretation rule: provenance confidence answers "do the rows point back to the staged corpus clearly enough?" Metadata confidence answers "do the rows carry enough structured metadata to drive conversion work without re-scraping the whole corpus?"

### Metadata Rubrics

- **Schema Capture Confidence**
	- what it measures: whether the expected metadata-bearing table shapes are present and stable across the workspace
	- freeze signal: the artifact currently contains **19** Phase 1 catalog tables using the full provenance-bearing row shape (Classic Name | Class | Sources | Staging Anchor | Type | Ch06 Import | osr: imported). Phase 2 mapping tables (conversion-note row shape) were retired after the import pass was affirmed; mapping decisions will be made inline during Pass 3.
	- rating: **1.00 / 1.00**
	- reason: table structure is stable and matches expected provenance-bearing shape across all 19 sub-sections.
- **Family Metadata Completeness**
	- what it measures: whether the catalog covers the full source-set structure needed for Chapter 06 ordering and conversion work
	- freeze signal: all **317** catalog rows are organized across **6** source lanes (B, E, C, M, I, RC) and **19** sub-category sections (Cleric, Arcane, Druid, Item and Interface Effects, Procedures), covering the full BECMI lane and class hierarchy. Phase 2 family grouping tables were retired; the source-lane structure is the current organization.
	- rating: **1.00 / 1.00**
	- reason: all 6 source lanes and all sub-categories are present and fully populated.
- **Row-State Label Coverage**
	- what it measures: whether all in-scope catalog rows carry an explicit terminal import state
	- freeze signal: the `osr: imported` column shows **206** rows as `yes` and **0** rows as `-` for ✓ (Ch06-linked) entries; **111** rows carry `—` (non-Ch06 scope, not applicable). Phase 2 mapping labels (`direct`/`partial`/`custom`) were recorded in planning tables now retired; those decisions are deferred to inline Pass 3 work.
	- rating: **1.00 / 1.00**
	- reason: all in-scope rows carry an explicit terminal state; import-state coverage is 100%.
- **Evidence-Note Density**
	- what it measures: whether the artifact preserves enough explanatory provenance and exception tracking to support downstream conversion without returning to the staging corpus
	- freeze signal: **12** fully verified exception ledger rows (dated, searched, decisioned); **47** crosswalk rows updated during the 2026-03-30 lane-fix pass with explicit staging anchor updates; `audit_crosswalk_source_completeness.py` returning **0** candidates confirms all evidence gaps are closed. Phase 2 row-level evidence markers were retired with those tables; the pipeline verifiability layer now serves the same assurance function.
	- rating: **1.00 / 1.00**
	- reason: exception ledger fully populated; all lane coverage verified by pipeline; no unresolved provenance gaps remain.
- **Downstream Drafting Readiness**
	- what it measures: whether the artifact provides a stable base for Pass 3 SDM conversion work without returning to the staging corpus for every local decision
	- freeze signal: the literal `osr:` import pass is complete — all 196 spell recognizer cards in Chapter 06 carry verbatim staged witness text, verified by `import_ch06_osr.py check` (`drift: no`). The staging corpus remains frozen. Pass 3 conversion can proceed from the frozen `osr:` blocks without returning to staging for each row.
	- rating: **1.00 / 1.00**
	- reason: import pass complete; Chapter 06 `osr:` blocks are the stable, frozen base for all conversion work. Occasional returns to staging may still occur for edge cases but are not required for ordinary conversion.

- Overall metadata scrape confidence: **High Confidence (0.95 / 1.00)** — upgraded from 0.90, 2026-04-02 audit
	- summary: all 5 rubric sub-scores are 1.00; the literal `osr:` import pass is complete; provenance is fully clean and pipeline-verified. Remaining drag is Pass 3 conversion judgment, not metadata incompleteness.
- Residual metadata risks:
	- Pass 3 mapping decisions (equivalent to the retired `direct`/`partial`/`custom` Phase 2 labels) will be made inline during conversion; no planning artifact currently pre-decides these
	- some repeated note language and alias phrasing still need later editorial normalization, but they do not block downstream conversion use
	- exception rows and RC-only rows should be spot-checked during Pass 3 conversion as normal execution discipline

## Mapping Status Decision Matrix

Use these criteria when assigning or reviewing `direct`, `partial`, or `custom` status to any Phase 2 family row. Apply the first matching row in the table.

| Criterion | → `direct` | → `partial` | → `custom` |
| --- | --- | --- | --- |
| **SDM corpus match** | Functional match found; mechanics transfer with renaming only | Recognizer exists but requires mechanics adaptation or doctrine delta | No adequate SDM recognizer; new doctrine required |
| **Effect scope delta** | ≤ 10% delta on core mechanics (range, duration, save) | > 10% delta but preservable via tag, modifier, or variant note | Core mechanic unavailable in SDM; requires invention |
| **Reverse / alternate form** | No reverse, OR reverse is a clean symmetric inversion | Reverse present with rules delta that needs a conversion note | Reverse creates fundamentally different doctrine |
| **Evidence lock status** | Lock confirmed, no edge cases | Lock partial or implicit; edge case present | No lock or hard exception flags present |
| **Chapter 06 decision pending?** | No — mapping is unambiguous | Minor clarification needed during drafting | Yes — requires a doctrine decision before mapping |

## Metadata Confidence v2 Gate (2026-04-02 refresh)

Threshold definitions for moving between confidence bands:

| Threshold | Score | Gate Criteria |
| --- | --- | --- |
| **Minimum Viable** | 0.85 | Provenance verified; all rows have status labels; exception ledger exists; staging corpus frozen |
| **Approved Working Infrastructure** | 0.90 | Evidence-note density ≥ 50 markers; decision matrix documented; high-risk families (healing, defense/boundary, barrier) carry source-grounded evidence locks |
| **High Confidence** | 0.95 | Top custom rows and remaining fragile families carry denser evidence locks and a refresh audit confirms calibration |
| **Publication Ready** | 0.98 | All `partial`/`custom` rows carry evidence locks; row-state audit confirms calibration across all families; v2 gate in place |

### Current rating: High Confidence (0.95 / 1.00) — 2026-04-02 audit

- **Provenance (1.00)**: Exception ledger verified, all 12 exception rows confirmed, staged corpus frozen, and 2026-03-30 lane-fix pass closed the last known provenance gap (Basic MU2 uplift). `audit_crosswalk_source_completeness.py` returns 0 candidates; 196/196 staging rows show no missing witness lanes.
- **Row-State Coverage (1.00)**: 206 `osr: imported = yes` rows, 0 blocked rows, 111 `—` (out-of-scope). Phase 2 planning labels retired; import-state coverage 100%.
- **Evidence-Note Density (1.00)**: 12 fully verified exception ledger rows; 47 lane-fix pass updates with explicit staging anchors; pipeline audit returning 0 candidates serves as the verification layer.
- **Downstream Drafting Readiness (1.00)**: import pass complete; `import_ch06_osr.py check` shows `drift: no`; Chapter 06 `osr:` blocks are the frozen stable base for Pass 3 conversion.

**Gate status**: High Confidence gate cleared. Open for Pass 3 (`osr:` → SDM conversion) and Phase B (Power/Spell API Bridge).


## Forward Plan

1. Pass 1: update all stale confidence or audit notes and decide and implement locks across the active `_todo` governance stack.
2. Pass 2: build the clean multi-witness staging layer, then import literal `osr:` text into Chapter 06 Power cards for every in-scope spell recognizer row.
3. Pass 3: convert, power by power, `osr:` references into SDM system terms with the minimum changes required.
4. Pass 4: refine the Chapter 06 main-content rules blocks after the preservation pass is frozen.
5. **Phase B: Power / Spell API Bridge** — consume crosswalk doctrine to finish the bridge inside `ftls/Flying_Triremes_and_Laser_Swords_06_Powers_and_ECM.md`: convert classic spell names that still function only as recognizers into explicit SDM `power` language; lock `Power Level` for storage/capacity and `Level` for counterforce/dispel.

## Phase B Backlog: Chapter 06 `osr:` Import

This is the execution backlog for the first downstream phase after the staging-confidence lock. Current in-scope workload is the **184-name spell-only pass**, represented by **193** spell-import row entries in the catalog. This backlog covers literal OSR text preservation only. It does **not** authorize early SDM rewrite, balance work, or doctrine invention inside the `osr:` block.

### Pass 1: Lock, Readiness, And Tracker Normalization

1. Update all stale confidence or audit notes and decide and implement locks across the active `_todo` governance docs before any family import batch begins.
2. Synchronize this crosswalk's confidence section to the 2026-04-02 audit report and treat that report as the current measured baseline.
3. Record the current sequencing locks explicitly:
   - staged spell corpus frozen as source truth,
   - Chapter 06 design decisions locked,
   - Chapter 06 `alpha` still open,
   - Chapter 05 bridge work paused until Chapter 06 `alpha`.
4. Confirm the tracker contract is stable before import starts:
   - `Type = spell`,
   - `Ch06 Import = ✓`,
   - `osr: imported` is the execution-state field.
5. Treat any row that still depends on table-adjacent evidence or compressed artifact-power summaries as review-priority during the later exception sweep, even if the explicit `[table-derived]` marker has been retired.

### Gate And Freeze

6. Record the import gate as open only when the staging corpus remains frozen, provenance stays at required confidence, the exception ledger remains verified, and the clean multi-witness staging file remains reproducible from the frozen lane docs.
7. Treat the staged spell source set (`_todo/BECMI/TODO_PRE_ADD_Spell_Staging.md` and the six BECMI lane staging docs) as the only legal upstream witness base for `osr:` imports, and `_todo/BECMI/TODO_BECMI_Spell_Material_Staging.md` as the primary downstream import source. Do not copy from PDFs, OCR scratch files, or ad hoc notes once this phase begins.
8. Keep the current exception doctrine in force:
   - verified `RC`-only rows remain `RC`-only exceptions,
   - verified `Master`-only procedures remain `Master`-only exceptions,
   - no new provenance uplift work is bundled into the import pass unless a row is truly blocked.

### `osr:` Block Contract

9. Use `osr:` as a multi-witness preservation field, not a rewrite field. Imported text should stay verbatim to the staged source except for minimal line-wrap cleanup and source-grounded summaries of compact artifact-table shorthand when that shorthand is not useful as a standalone witness.
10. Preserve classic procedure details when they appear in any staged witness: original spell name, class/spell-level cues, range, duration, effect language, save language, reverse-form handling, and termination conditions.
11. When multiple staged witnesses exist, include all available witnesses in deterministic lane order inside the literal `osr:` block: `Basic`, `Expert`, `Companion`, `Master`, `Immortals`, `Rules Cyclopedia`.
12. Each witness inside `osr:` should carry a compact source label and its literal text, or a source-grounded summary when the staged witness is only compact artifact-table shorthand. Do not synthesize a preferred merged body, silently reconcile wording deltas, or collapse the witness bundle back to one compendium surface.
13. If a row has a meaningful wording-delta or artifact-summary risk note, preserve that warning in row notes or import-review notes rather than silently harmonizing the text.

### Crosswalk Control Board

14. Treat `Ch06 Import` and `osr: imported` as the canonical import tracker for every Chapter 06 recognizer row.
15. Normalize import-state usage:
   - `Ch06 Import`: `✓` when a Chapter 06 card exists, `—` when no Chapter 06 card is planned.
   - `osr: imported`: `-` not started, `in-progress` active work, `yes` imported, `[needs-review]` imported but blocked on witness-audit or formatting/rendering check.
16. Limit blocker notes to real execution blockers only: missing Chapter 06 card, malformed staged witness extraction, missing expected witness lanes, or card-rendering/import failure.
17. Bulk runs may resync all in-scope spell rows and the full review queue. Targeted runs should update only the selected card’s row state and any review-queue entry tied to that one spell.
18. Work in existing Chapter 06 family order so import and review follow manuscript structure rather than source-book order.

### Manuscript Import Pass

19. Build or refresh `_todo/BECMI/TODO_BECMI_Spell_Material_Staging.md` before manuscript import work so Chapter 06 consumes one clean downstream witness bundle.
20. Replace every Chapter 06 spell-card `osr:` block for OSR recognizer cards with the full staged witness bundle for that spell.
21. Keep the FTLS main rules body, tags, and existing `meta:` structure stable during this pass except where minimum provenance cleanup is required to match the imported witness.
22. Do not import `osr:` blocks for non-OSR heritage powers, item-effects, procedures, or other entries that are not part of the spell recognizer bridge.
23. Preserve existing `see` pointers to SDM variants; those pointers are not a reason to omit the canonical OSR block.

### Audit And Acceptance

24. After each family batch, verify that:
   - the `osr:` block is no longer placeholder text,
   - all expected staged witnesses appear in deterministic lane order,
   - the imported text matches the staged anchor named in the row,
   - the row tracker is updated in the crosswalk,
   - the card still renders cleanly as Markdown.
25. Run stricter spot checks on all exception-state rows, all `RC`-only exceptions, all `Master`-only exceptions, any row still relying on compressed artifact-summary prose, and every row where the clean staging file reports a missing expected witness lane.
26. Capture unresolved problems in an import-review queue instead of solving them by rewriting the preserved OSR text.
27. The import phase is complete only when all 184 in-scope Chapter 06 spell names are no longer blocked in the importer workflow, all Chapter 06 spell recognizer rows marked `✓` show `osr: imported = yes` or an explicit review-state marker, and the deterministic import check passes cleanly.

### Downstream Handoff

28. Once the literal import pass is complete, open the next queue separately:
   - convert `osr:` references into SDM-native Chapter 06 rules text,
   - refine main-body FTLS mechanics power by power,
   - leave `osr:` preservation text frozen unless provenance correction is required.


## Chapter 06 `osr:` Import Review Queue



## Reference Reuse Targets

- Reuse [Synthetic_Dream_Machine_04_Powers_Index.md](/home/joshu/Synthetic-Dream-Machine/Synthetic_Dream_Machine_04_Powers_Index.md) for power template shape and existing variant precedent.
- Reuse [Synthetic_Dream_Machine_05_Gear_Index.md](/home/joshu/Synthetic-Dream-Machine/Synthetic_Dream_Machine_05_Gear_Index.md) for ward mechanics, antimagic handling, spell-eater style item interfaces, and storage-facing gear language.
- Reuse [ftls/Flying_Triremes_and_Laser_Swords_10_Appendix_Null_Referee_Resources.md](/home/joshu/Synthetic-Dream-Machine/ftls/Flying_Triremes_and_Laser_Swords_10_Appendix_Null_Referee_Resources.md) for tag vocabulary that should inform grouped family heuristics and cross-labels.
- Reuse [Synthetic_Dream_Machine_01_Quickstart.md](/home/joshu/Synthetic-Dream-Machine/Synthetic_Dream_Machine_01_Quickstart.md) for burden, item, and broad powers-access assumptions when the mechanics-delta note needs a canonical anchor.
- Reuse [Synthetic_Dream_Machine_03_Traits_Index.md](/home/joshu/Synthetic-Dream-Machine/Synthetic_Dream_Machine_03_Traits_Index.md) when storage-form differences or bearer-access doctrine suggest trait-side handling such as `Power Scroller`.
- Reuse [sdm/Vastlands_Guidebook/Vastlands_Guidebook.md](/home/joshu/Synthetic-Dream-Machine/sdm/Vastlands_Guidebook/Vastlands_Guidebook.md) for `Albums of Power`, `Storing Powers`, `Activating Powers`, and `Proper Wizard` as the clearest non-slot precedent set for SDM family naming and power storage behavior. Also a good referencve for Luka Rejec style & tone mapping.

## Canonical Name / Variant Doctrine

- The crosswalk is keyed by canonical OSR spell or effect name first.
- Existing entries in [Synthetic_Dream_Machine_04_Powers_Index.md](/home/joshu/Synthetic-Dream-Machine/Synthetic_Dream_Machine_04_Powers_Index.md) that clearly descend from classic spells should be treated as unique SDM variants, not as replacements for the canonical row key.
- Chapter 06 should normally list the canonical spell name, then note any existing stylized SDM variant with a `see` pointer.
- The default manuscript pattern is: canonical spell entry first, variant callout second. Example: `Magic Missile` with a note to see `Tragic Missile`.
- A canonical spell may have zero, one, or several existing SDM variants. Record them when they exist; do not force one variant to become the only canonical implementation.
- Existing variant powers are useful precedent for tone, presentation, and implementation direction, but they do not erase the need to preserve the classic recognizer/API surface.

Variant recording rule for this workspace:
- When a clear SDM variant already exists, record it in the row `Notes` field as `Existing SDM variant: <Power Name> (<source lane>)` until or unless the table grows a dedicated variant column.

## RC Canonical Compendium Reference Doctrine

- Treat `RC` as the canonical compendium text surface, not as a replacement for pre-compendium BECMI spell history.
- For any row that includes `RC`, keep version awareness explicit in source references:
	- `RC` anchor: compendium wording/index form used for canonical lookup.
	- pre-`RC` anchor(s): earliest staged BECMI source lane(s) currently evidenced in this repository.
- Normal completion target: if a spell is present in `RC` and also present in staged pre-`RC` BECMI material, the row should show both. Do not collapse it to a lone `RC` witness for convenience.
- If a row currently has only `RC` source support in staged material, keep it `RC`-only for now and treat pre-`RC` provenance as unresolved rather than assumed.
- When `RC` normalizes spelling, naming, or indexing relative to earlier books, preserve both forms in row notes as recognizer aliases.
- For item-effect rows evidenced from the staged Chapter 16 catalog, prefer explicit item-surface anchors instead of generic `RC` shorthand:
	- `RC -> Chapter 16 Item Description Catalog -> Rings`
	- `RC -> Chapter 16 Item Description Catalog -> Wands, Staves, and Rods`
	- `RC -> Chapter 16 Item Description Catalog -> Miscellaneous Items`

### Preferred Row Shapes

- **Standard spell row with dual provenance**
	- `Source Book(s)`: `Basic, RC` or `Expert, Master, RC`
	- `Staging Anchor / Section`: `Basic -> ...; RC -> ...`
- **Legitimate RC-only exception row**
	- Use only when no earlier staged BECMI witness is currently evidenced.
	- Note that status explicitly in `Notes` when it matters for downstream conversion confidence.
- **Item-effect row with RC catalog witness**
	- `Source Book(s)`: `Companion, RC` or `Expert, RC`
	- `Staging Anchor / Section`: `Companion -> ...; RC -> Chapter 16 Item Description Catalog -> ...`
- **Non-RC exception row**
	- Allowed when the spell/effect is genuinely outside the Rules Cyclopedia corpus or the current staged RC lane does not evidence it.
	- Treat this as an exception state that should be obvious from `Source Book(s)` rather than hidden in notes.

## Existing Variant Inventory

Starter batch of already-identified Luka-style descendants or family variants from the Powers Index.

| Canonical Key | Existing SDM Variant | Relation | Powers Index Source Lane | Planning Use |
| --- | --- | --- | --- | --- |
| Magic Missile | Tragic Missile | close descendant | Vastlands / Apocrypha of the O.S. | Keep `Magic Missile` as the Chapter 06 heading; add `see Tragic Missile`. |
| Floating Disc | Floating Disc | direct stylized rendition | UVG2e Spells | Canonical entry can point directly to the existing variant without renaming the recognizer. |
| Knock | Knock / Lock | broadened descendant | UVG2e Spells | Treat `Knock` as canonical and note the lock/unlock SDM variant alongside it. |
| Hold Person | Hlod Person | playful descendant | Vastlands / Apocrypha of the O.S. | Preserve the canonical restraint spell name and use the Luka version as a named variant. |
| Animate Dead | Animate Corpse | close descendant | UVG2e Spells | Use the canonical necromancy key while treating the UVG rite as a specific implementation path. |
| Raise Dead | Raise Dead | dark exact-name rendition | UVG2e Spells | Same recognizer, but the UVG rendering is an undead/parody-of-life implementation rather than a clean restoration effect. |
| Magic Jar | Magic Jar | exact-name rendition | UVG2e Spells | Strong direct precedent for identity-transfer / crystal mind-storage handling in Chapter 06. |
| Read Languages / language-bridge family | Anti-Babylon | family variant | Eternal Return Key | Useful for language, communication, and universal-translation families without collapsing them into one exact spell name. |
| Fireball | Pyreball | close descendant | Vastlands / Apocrypha of the O.S. | Preserve `Fire Ball` and `Fireball` as recognizer aliases while pointing to the existing Luka-style fireburst variant. |
| Polymorph Self / Alter Self family | Alter Self | family variant | UVG2e Spells | Useful precedent for self-directed transformation even when the canonical BECMI keys remain separate. |
| Wish | Big Wish | stylized high-tier descendant | Vastlands / Apocrypha of the O.S. | Preserve `Wish` as the canonical heading and treat `Big Wish` as a distinctive SDM presentation. |

## Likely Further Candidates From Powers Index Compare Pass

Validated candidates from a broader compare pass. These are promising enough to track, but should not all be promoted to row-level `Existing SDM variant` notes without a spell-by-spell decision.

| Canonical Spell / Family | Powers Index Entry | Confidence | Why It Looks Relevant | Likely Use |
| --- | --- | --- | --- | --- |
| Truesight / True Seeing family | Eyes of Akaula | medium-high | Sees invisible, hidden, departed, and dead things for a day; strong reveal/divination package. | Good precedent for premium perception and anti-concealment powers. |
| Wizard Eye / Clairvoyance family | Eyes of the Arrow | medium-high | Binds awareness to a projectile to create a mobile remote sensor. | Good precedent for remote-sight and scouting powers. |
| Teleportation / portal family | Linked Portals | medium | Two linked astral hoops move creatures and objects through connected space rather than instant self-relocation. | Better treated as a portal/travel family cousin than a direct `Teleport` replacement. |
| Telekinesis / mage-hand family | Objective Telekinesis | medium-high | Creates an ectoplasmic hand that manipulates and crushes nearby objects. | Good precedent for low-tier force-manipulation powers. |
| Speak With Dead family | Speak With Husk | high | Corpse answers three questions; overcharge allows fuller conversation. | Strong candidate for eventual row-level variant handling. |
| Detect Evil / Know Alignment family | Sense Allegiance | medium-high | Reads a creature’s ethics directly and can stun evil targets on contact. | Strong precedent for allegiance-reading and anti-evil detection lanes. |
| Invisibility / concealment family | Ecosphere Veil | medium-high | Makes creatures disregard the target; overcharge reaches effective invisibility and trace suppression. | Strong SDM-native concealment precedent, though it is built on disregard rather than simple optical hiding. |
| Polymorph Self / shapechange family | Skinshift | medium-high | Full body transformation into familiar beast forms with escalating size options. | Stronger and broader than `Alter Self`; likely useful when the transformation pass deepens. |
| Charm Person / Mass Charm family | Hero’s Goldenmouth | medium | Crowd-facing charm through rhetoric and trust rather than direct domination. | Better treated as a social-compulsion cousin than a clean exact spell rename. |
| Obscuring mist / fog / concealment family | Yellow Cloud | medium | A 9m cube of sight-blocking dust plus an overcharged dust wall. | Good concealment / battlefield-obscuration precedent. |
| Detect sentience / aura-reading / ESP family | Yellow Foresight | medium | Scans a wide area for the number and general mood of sentients; overcharge nudges attitude. | Good precedent for mood-reading and population-sense divinations. |
| Regeneration / restoration family | Rehoryan’s Progressive Restoration | medium-high | Rapid life recovery plus staged bodily repair and regrowth. | Strong precedent for higher-tier restoration/regeneration effects distinct from ordinary cure spells. |
| Cure disease / poison purge / organ repair family | Real-Time Rebuild | high | Explicit power settings flush toxins or afflictions, restore organs, regrow limbs, or rebuild bodies. | One of the strongest SDM precedents for bodily repair, poison purge, and major restoration notes. |
| Raise Dead / soul-return family | Recall Soul | medium-high | Calls back a soul as an ectoplasmic entity that can be captured or redirected into further procedures. | Useful ritual cousin when resurrection conversion needs explicit soul-handling rather than simple revival. |
| Haste / acceleration family | Nunka’s Biophysical Overdrive | medium-high | Drives the target into short-term overperformance followed by exhaustion burdens. | Strong speed-boost precedent with explicitly SDM costs and aftermath. |
| Fireball storage-delivery family | Gem Bomb | medium | Encodes an explosive forcefield into a gem, with overcharge exploding like a Fireball. | Good item-interface cousin for fireburst delivery and storage notes. |

## Active Phase Scope

## Phase 1 Catalog Workspace

Initial flat catalog seed for the full-spell pass. This section uses lane-first parent buckets (`B`, `E`, `C`, `M`, `I`, `RC`) with topic sub-buckets so source lineage stays explicit while uncatalogued names remain visible.

`Class(es)/Spell-level` uses RC shorthand: `C` = cleric, `Dr` = druid, `MU` = magic-user. Duplicate canonical rows keep the full cross-tradition class tags where relevant. Non-spell rows stay blank in this column.

Expert catalog dedupe note: when an BECMI era spell is shared across cleric and magic-user lists, keep canonical rows with full cross-tradition class tags to avoid note drift. Source-era spelling or capitalization variants may be retained only as alias language inside the notes.

### B - Basic

#### Cleric

| Classic Name | Class(es)/Spell-level | Source Book(s) | Staging Anchor / Section | Type | Ch06 Import | osr: imported |
| --- | --- | --- | --- | --- | --- | --- |
| Cure Light Wounds | C1 | Basic, Expert, RC | Basic -> Spell Lists and Basic Spell Descriptions; Expert -> Clerical and Magic-User Spell Expansions; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |
| Detect Evil | C1, MU2 | Basic, Expert, RC | Basic -> Spell Lists and Basic Spell Descriptions; Expert -> Clerical and Magic-User Spell Expansions; RC -> Clerical and Magical Spells Lists and Spell Descriptions | spell | ✓ | yes |
| Detect Magic | C1, MU1 | Basic, Expert, RC | Basic -> Spell Lists and Basic Spell Descriptions; Expert -> Clerical and Magic-User Spell Expansions; RC -> Clerical and Magical Spells Lists and Spell Descriptions | spell | ✓ | yes |
| Light | C1, MU1 | Basic, Expert, RC | Basic -> Spell Lists and Basic Spell Descriptions; Expert -> Clerical and Magic-User Spell Expansions; RC -> Clerical and Magical Spells Lists and Spell Descriptions | spell | ✓ | yes |
| Protection from Evil | C1, MU1 | Basic, Expert, RC | Basic -> Spell Lists and Basic Spell Descriptions; Expert -> Clerical and Magic-User Spell Expansions; RC -> Clerical and Magical Spells Lists and Spell Descriptions | spell | ✓ | yes |
| Purify Food and Water | C1 | Basic, RC | Basic -> Spell Lists and Basic Spell Descriptions; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |
| Remove Fear | C1 | Basic, Expert, RC | Basic -> Spell Lists and Basic Spell Descriptions; Expert -> Clerical and Magic-User Spell Expansions; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |
| Resist Cold | C1 | Basic, RC | Basic -> Spell Lists and Basic Spell Descriptions; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |

#### Arcane (Basic-Anchored And Shared Entries)

| Classic Name | Class(es)/Spell-level | Source Book(s) | Staging Anchor / Section | Type | Ch06 Import | osr: imported |
| --- | --- | --- | --- | --- | --- | --- |
| Charm Person | MU1 | Basic, Expert, RC | Basic -> Spell Lists and Basic Spell Descriptions; Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Fireball | MU3 | Basic, Expert, Master, RC | Basic -> Higher Level Spells, Magic-User Spell Allocation, and Lost Spell Books; Expert -> Clerical and Magic-User Spell Expansions; Master -> Artifact Chapter Context and Witnesses; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Floating Disc | MU1 | Basic, Expert, RC | Basic -> Spell Lists and Basic Spell Descriptions; Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Hold Portal | MU1 | Basic, Expert, RC | Basic -> Spell Lists and Basic Spell Descriptions; Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Light | C1, MU1 | Basic, Expert, RC | Basic -> Spell Lists and Basic Spell Descriptions; Expert -> Clerical and Magic-User Spell Expansions; RC -> Clerical and Magical Spells Lists and Spell Descriptions | spell | ✓ | yes |
| Magic Missile | MU1 | Basic, Expert, RC | Basic -> Spell Lists and Basic Spell Descriptions; Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Protection from Evil | C1, MU1 | Basic, Expert, RC | Basic -> Spell Lists and Basic Spell Descriptions; Expert -> Clerical and Magic-User Spell Expansions; RC -> Clerical and Magical Spells Lists and Spell Descriptions | spell | ✓ | yes |
| Read Languages | MU1 | Basic, Expert, RC | Basic -> Spell Lists and Basic Spell Descriptions; Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Read Magic | MU1 | Basic, Expert, RC | Basic -> Spell Lists and Basic Spell Descriptions; Expert -> Clerical and Magic-User Spell Expansions; RC -> Scrolls | spell | ✓ | yes |
| Shield | MU1 | Basic, Expert, RC | Basic -> Spell Lists and Basic Spell Descriptions; Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Sleep | MU1 | Basic, Expert, RC | Basic -> Spell Lists and Basic Spell Descriptions; Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Ventriloquism | MU1 | Basic, Expert, RC | Basic -> Spell Lists and Basic Spell Descriptions; Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |

#### Item And Interface Effects

| Classic Name | Class(es)/Spell-level | Source Book(s) | Staging Anchor / Section | Type | Ch06 Import | osr: imported |
| --- | --- | --- | --- | --- | --- | --- |
| Maps to Treasures / Treasure Maps |  | Basic, Expert, RC | Basic -> Scrolls and Spell-Adjacent Treasure Text; Expert -> Scrolls, Rings, Wands, Staves, Rods, and Spell-Adjacent Treasure Text; RC -> Scrolls | item-effect | — | - |
| Protection / Protection Scrolls |  | Basic, Expert, RC | Basic -> Scrolls and Spell-Adjacent Treasure Text; Expert -> Scrolls, Rings, Wands, Staves, Rods, and Spell-Adjacent Treasure Text; RC -> Scrolls | item-effect | — | - |
| Protection from Lycanthropes |  | Basic, RC | Basic -> Scrolls and Spell-Adjacent Treasure Text; RC -> Scrolls | item-effect | — | - |
| Protection from Undead |  | Basic, RC | Basic -> Scrolls and Spell-Adjacent Treasure Text; RC -> Scrolls | item-effect | — | - |
| Spell Scrolls / Spells |  | Basic, Expert, RC | Basic -> Scrolls and Spell-Adjacent Treasure Text; Expert -> Scrolls, Rings, Wands, Staves, Rods, and Spell-Adjacent Treasure Text; RC -> Scrolls | item-effect | — | - |
| Cursed / Cursed Scroll |  | Basic, RC | Basic -> Scrolls and Spell-Adjacent Treasure Text; RC -> Scrolls | item-effect | — | - |
| Holy Water |  | Basic | Basic -> Magic Item Identification, Use Model, and Charge Doctrine | item-effect | — | - |

#### Procedures

| Classic Name | Class(es)/Spell-level | Source Book(s) | Staging Anchor / Section | Type | Ch06 Import | osr: imported |
| --- | --- | --- | --- | --- | --- | --- |
| Turning Undead |  | Basic | Basic -> Turning Undead | procedure | — | - |

### E - Expert

#### Cleric

| Classic Name | Class(es)/Spell-level | Source Book(s) | Staging Anchor / Section | Type | Ch06 Import | osr: imported |
| --- | --- | --- | --- | --- | --- | --- |
| Bless | C2 | Basic, Expert, RC | Basic -> Higher Level Spells, Magic-User Spell Allocation, and Lost Spell Books; Expert -> Clerical and Magic-User Spell Expansions; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |
| Continual Light | C3, MU2 | Basic, Expert, RC | Basic -> Spell Lists and Basic Spell Descriptions -> Magic-User Spells: Second Level; Expert -> Clerical and Magic-User Spell Expansions; RC -> Clerical and Magical Spells Lists and Spell Descriptions | spell | ✓ | yes |
| Continual Darkness | C3, MU2 | RC | RC -> RC: Reverse Spell Synthesized Notes | spell | ✓ | yes |
| Cure Blindness | C3 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |
| Cure Disease | C3 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |
| Find Traps | C2 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |
| Animal Growth | C3 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |
| Hold Person | C2, MU3 | Basic, Expert, RC | Basic -> Higher Level Spells, Magic-User Spell Allocation, and Lost Spell Books; Expert -> Clerical and Magic-User Spell Expansions; RC -> Clerical and Magical Spells Lists and Spell Descriptions | spell | ✓ | yes |
| Know Alignment | C2 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |
| Locate Object | C3, MU2 | Basic, Expert, RC | Basic -> Spell Lists and Basic Spell Descriptions -> Magic-User Spells: Second Level; Expert -> Clerical and Magic-User Spell Expansions; RC -> Clerical and Magical Spells Lists and Spell Descriptions | spell | ✓ | yes |
| Remove Curse | C3, MU4 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Clerical and Magical Spells Lists and Spell Descriptions | spell | ✓ | yes |
| Resist Fire | C2 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |
| Silence 15' Radius | C2 | Basic, Expert, RC | Basic -> Higher Level Spells, Magic-User Spell Allocation, and Lost Spell Books; Expert -> Clerical and Magic-User Spell Expansions; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |
| Snake Charm | C2 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |
| Speak with Animals | C2 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |
| Speak with the Dead | C3 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |
| Speak with Plants | C4 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |
| Sticks to Snakes | C4 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |
| Striking | C3 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |
| Animate Dead | C4, MU5 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Clerical and Magical Spells Lists and Spell Descriptions | spell | ✓ | yes |
| Create Water | C4 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |
| Cure Serious Wounds | C4 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |
| Dispel Magic | C4, MU3 | Basic, Expert, Master, RC | Basic -> Spell Lists and Basic Spell Descriptions -> Magic-User Spells: Second Level; Expert -> Clerical and Magic-User Spell Expansions; Master -> High-Level Procedure Notes; RC -> Clerical and Magical Spells Lists and Spell Descriptions | spell | ✓ | yes |
| Neutralize Poison | C4 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |

#### Arcane

| Classic Name | Class(es)/Spell-level | Source Book(s) | Staging Anchor / Section | Type | Ch06 Import | osr: imported |
| --- | --- | --- | --- | --- | --- | --- |
| Continual Light | C3, MU2 | Basic, Expert, RC | Basic -> Spell Lists and Basic Spell Descriptions -> Magic-User Spells: Second Level; Expert -> Clerical and Magic-User Spell Expansions; RC -> Clerical and Magical Spells Lists and Spell Descriptions | spell | ✓ | yes |
| Continual Darkness | C3, MU2 | RC | RC -> RC: Reverse Spell Synthesized Notes | spell | ✓ | yes |
| Dancing Lights | MU1 | Holmes | Holmes -> hb-dancing-lights | spell | ✓ | yes |
| Darkness | MU2 | Greyhawk, Holmes, RC | Greyhawk -> gh-darkness; Holmes -> hb-darkness; RC -> RC: Reverse Spell Synthesized Notes (synthesized from Expert Basic section and Expert MU1 Spell Expansions, within Light*; note: Expert text says "all sight except infravision" — synthesized block adopts Holmes/Greyhawk reading: infravision useless inside darkness) | spell | ✓ | yes |
| Detect Evil | C1, MU2 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Clerical and Magical Spells Lists and Spell Descriptions | spell | ✓ | yes |
| Detect Invisible | MU2 | Basic, Expert, RC | Basic -> Spell Lists and Basic Spell Descriptions -> Magic-User Spells: Second Level; Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Dispel Magic | C4, MU3 | Basic, Expert, Master, RC | Basic -> Higher Level Spells, Magic-User Spell Allocation, and Lost Spell Books; Expert -> Clerical and Magic-User Spell Expansions; Master -> High-Level Procedure Notes; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| ESP | MU2 | OD&D Family, Basic, Expert, RC | OD&D Family -> odnd-esp; Basic -> Spell Lists and Basic Spell Descriptions -> Magic-User Spells: Second Level; Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Enlargement | MU1 | Holmes | Holmes -> hb-enlargement | spell | ✓ | yes |
| Fly | MU3 | Basic, Expert, RC | Basic -> Higher Level Spells, Magic-User Spell Allocation, and Lost Spell Books; Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Invisibility | MU2 | Basic, Expert, RC | Basic -> Spell Lists and Basic Spell Descriptions -> Magic-User Spells: Second Level; Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Invisibility 10' Radius | MU3 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Knock | MU2 | Basic, Expert, RC | Basic -> Spell Lists and Basic Spell Descriptions -> Magic-User Spells: Second Level; Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Levitate | MU2 | Basic, Expert, RC | Basic -> Spell Lists and Basic Spell Descriptions -> Magic-User Spells: Second Level; Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Lightning Bolt | MU3 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Locate Object | C3, MU2 | Basic, Expert, RC | Basic -> Spell Lists and Basic Spell Descriptions -> Magic-User Spells: Second Level; Expert -> Clerical and Magic-User Spell Expansions; RC -> Clerical and Magical Spells Lists and Spell Descriptions | spell | ✓ | yes |
| Mirror Image | MU2 | Basic, Expert, RC | Basic -> Spell Lists and Basic Spell Descriptions -> Magic-User Spells: Second Level; Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Phantasmal Force | MU2 | Basic, Expert, RC | Basic -> Spell Lists and Basic Spell Descriptions -> Magic-User Spells: Second Level; Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Protection from Evil 10' Radius | C4, MU3 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Clerical and Magical Spells Lists and Spell Descriptions | spell | ✓ | yes |
| Protection from Normal Missiles | MU3 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Water Breathing | Dr3, MU3 | Expert, Companion, Master, RC | Expert -> Clerical and Magic-User Spell Expansions; Companion -> Druid Spell Material; Master -> Druid Spell Material; RC -> Druidic and Magical Spells Lists and Spell Descriptions | spell | ✓ | yes |
| Web | MU2 | Basic, Expert, RC | Basic -> Spell Lists and Basic Spell Descriptions -> Magic-User Spells: Second Level; Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Wizard Lock | MU2 | Basic, Expert, RC | Basic -> Spell Lists and Basic Spell Descriptions -> Magic-User Spells: Second Level; Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Anti-Magic Shell | MU6 | Expert, Master, RC | Expert -> Clerical and Magic-User Spell Expansions; Master -> Artifact Chapter Context and Witnesses; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Animate Dead | C4, MU5 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Clerical and Magical Spells Lists and Spell Descriptions | spell | ✓ | yes |
| Audible Glamer | MU2 | Holmes | Holmes -> hb-audible-glamer | spell | ✓ | yes |
| Charm Monster | MU4 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Clairaudience | MU3 | Men & Magic, Holmes, OD&D Family | Men & Magic -> mm-clairaudience; Holmes -> hb-clairaudience; OD&D Family -> odnd-clairaudience | spell | ✓ | yes |
| Clairvoyance | MU3 | OD&D Family, Expert, RC | OD&D Family -> odnd-clairvoyance; Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Cloudkill | MU5 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Confusion | MU4 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Conjure Elemental | MU5 | Expert, Companion, Immortals, RC | Expert -> Clerical and Magic-User Spell Expansions; Companion -> Spell-Adjacent Rings, Rods, and Miscellaneous Magic Items; Immortals -> Section 3: Immortal Magic -> Explanation of Terms, Charts S1-S4 -> Conjure Elemental; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Death Spell | MU6 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Dimension Door | MU4 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Disintegrate | MU6 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Geas | MU6 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Growth of Plants | MU4 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Hallucinatory Terrain | MU4 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Haste | MU3 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Hold Monster | MU5 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Ice Storm/Wall | MU4 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Infravision | MU3 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Invisible Stalker | MU6 | Expert, Immortals, RC | Expert -> Clerical and Magic-User Spell Expansions; Immortals -> Section 3: Immortal Magic -> Explanation of Terms, Charts S1-S4 -> Invisible Stalker; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Lower Water | MU6 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Magic Mouth | MU2 | Greyhawk, Holmes | Greyhawk -> gh-magic-mouth; Holmes -> hb-magic-mouth | spell | ✓ | yes |
| Magic Jar | MU5 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Massmorph | MU4 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Passwall | MU5 | Expert, Master, RC | Expert -> Clerical and Magic-User Spell Expansions; Master -> Artifact Chapter Context and Witnesses; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Polymorph Others | MU4 | Expert, Master, RC | Expert -> Clerical and Magic-User Spell Expansions; Master -> Artifact Chapter Context and Witnesses; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Polymorph Self | MU4 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Projected Image | MU6 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Pyrotechnics | MU2 | Greyhawk, Holmes | Greyhawk -> gh-pyrotechnics; Holmes -> hb-pyrotechnics | spell | ✓ | yes |
| Ray of Enfeeblement | MU2 | Holmes | Holmes -> hb-ray-of-enfeeblement | spell | ✓ | yes |
| Remove Curse | C3, MU4 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Clerical and Magical Spells Lists and Spell Descriptions | spell | ✓ | yes |
| Slow | MU3 | Men & Magic | Men & Magic -> mm-slow | spell | ✓ | yes |
| Stone to Flesh | MU6 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Strength | MU2 | Greyhawk, Holmes | Greyhawk -> gh-strength; Holmes -> hb-strength | spell | ✓ | yes |
| Teleport | MU5 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Wall of Fire | MU4 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Wall of Stone | MU5 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Wizard Eye | MU4 | Expert, RC | Expert -> Clerical and Magic-User Spell Expansions; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |

#### Item And Interface Effects

| Classic Name | Class(es)/Spell-level | Source Book(s) | Staging Anchor / Section | Type | Ch06 Import | osr: imported |
| --- | --- | --- | --- | --- | --- | --- |
| Animal Control |  | Expert | Expert -> Magic Item Doctrine and Intelligent Weapons | item-effect | — | - |
| Dragon Control |  | Expert | Expert -> Magic Item Doctrine and Intelligent Weapons | item-effect | — | - |
| Heroism |  | Expert | Expert -> Magic Item Doctrine and Intelligent Weapons | item-effect | — | - |
| Intelligent Swords / Special Swords |  | Expert | Expert -> Magic Item Doctrine and Intelligent Weapons | item-effect | — | - |
| Invulnerability |  | Expert | Expert -> Magic Item Doctrine and Intelligent Weapons | item-effect | — | - |
| Djinni Summoning |  | Expert | Expert -> Scrolls, Rings, Wands, Staves, Rods, and Spell-Adjacent Treasure Text -> Rings | item-effect | — | - |
| Human Control |  | Expert | Expert -> Scrolls, Rings, Wands, Staves, Rods, and Spell-Adjacent Treasure Text -> Rings | item-effect | — | - |
| Plant Control |  | Expert | Expert -> Scrolls, Rings, Wands, Staves, Rods, and Spell-Adjacent Treasure Text -> Rings | item-effect | — | - |
| Protection from Elementals |  | Expert, RC | Expert -> Scrolls, Rings, Wands, Staves, Rods, and Spell-Adjacent Treasure Text -> Protection Scrolls; RC -> Scrolls | item-effect | — | - |
| Protection +1, 5' radius |  | Expert | Expert -> Scrolls, Rings, Wands, Staves, Rods, and Spell-Adjacent Treasure Text -> Rings | item-effect | — | - |
| Protection from Magic |  | Expert, RC | Expert -> Scrolls, Rings, Wands, Staves, Rods, and Spell-Adjacent Treasure Text -> Protection Scrolls; RC -> Scrolls | item-effect | — | - |
| Regeneration |  | Expert | Expert -> Scrolls, Rings, Wands, Staves, Rods, and Spell-Adjacent Treasure Text -> Rings | item-effect | — | - |
| Spell Storing |  | Expert, Companion, RC | Expert -> Scrolls, Rings, Wands, Staves, Rods, and Spell-Adjacent Treasure Text -> Rings; Companion -> Spell-Adjacent Rings, Rods, and Miscellaneous Magic Items -> Rings; RC -> Chapter 16 Item Description Catalog -> Rings | item-effect | — | - |
| Treasure Finding |  | Expert | Expert -> Magic Item Doctrine and Intelligent Weapons | item-effect | — | - |
| Ring of Spell Turning |  | Expert, RC | Expert -> Scrolls, Rings, Wands, Staves, Rods, and Spell-Adjacent Treasure Text -> Rings; RC -> Chapter 16 Item Description Catalog -> Rings | item-effect | — | - |
| Wand of Negation |  | Expert | Expert -> Scrolls, Rings, Wands, Staves, Rods, and Spell-Adjacent Treasure Text -> Wands, Staves, and Rods | item-effect | — | - |
| Elemental Devices |  | Expert | Expert -> Scrolls, Rings, Wands, Staves, Rods, and Spell-Adjacent Treasure Text -> Miscellaneous Magic Items | item-effect | — | - |
| Helm of Teleportation |  | Expert | Expert -> Scrolls, Rings, Wands, Staves, Rods, and Spell-Adjacent Treasure Text -> Miscellaneous Magic Items | item-effect | — | - |

#### Procedures

| Classic Name | Class(es)/Spell-level | Source Book(s) | Staging Anchor / Section | Type | Ch06 Import | osr: imported |
| --- | --- | --- | --- | --- | --- | --- |
| Alchemical Potion Duplication / Potion Research Support |  | Expert | Expert -> Magic Support Infrastructure | procedure | — | - |
| Sage Magical Research Support |  | Expert | Expert -> Magic Support Infrastructure | procedure | — | - |
| Spellbook Replacement |  | Basic, Expert, RC | Basic -> Spellbooks and Lost Book Recovery; Expert -> Research and Lost Spell Books; RC -> Magic-User Spell Books and Lost Spell Books | procedure | — | - |
| Magic Item Range/Duration Default |  | Expert | Expert -> Magic Item Doctrine and Intelligent Weapons | procedure | — | - |
| Magic Detection/Control Blocking |  | Expert | Expert -> Magic Item Doctrine and Intelligent Weapons | procedure | — | - |
| Intelligent Item Will Power / Control Check |  | Expert | Expert -> Magic Item Doctrine and Intelligent Weapons | procedure | — | - |

### C - Companion

#### Cleric

| Classic Name | Class(es)/Spell-level | Source Book(s) | Staging Anchor / Section | Type | Ch06 Import | osr: imported |
| --- | --- | --- | --- | --- | --- | --- |
| Aerial Servant | C6 | Companion, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Sixth-Level Cleric Spells; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |
| Animate Objects | C6 | Expert, Companion, RC | Expert -> Clerical and Magic-User Spell Expansions -> Sixth-Level Clerical Spells; Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Sixth-Level Cleric Spells; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |
| Barrier | C6 | Companion, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Sixth-Level Cleric Spells; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |
| Commune | C5 | Expert, Companion, RC | Expert -> Clerical and Magic-User Spell Expansions -> Fifth-Level Clerical Spells; Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Fifth-Level Cleric Spells; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |
| Create Food | C5 | Expert, Companion, RC | Expert -> Clerical and Magic-User Spell Expansions -> Fifth-Level Clerical Spells; Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Fifth-Level Cleric Spells; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |
| Create Normal Animals | C6 | Companion, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Sixth-Level Cleric Spells; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |
| Cure Critical Wounds | C5 | Companion, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Fifth-Level Cleric Spells; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |
| Cureall | C6 | Companion, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Sixth-Level Cleric Spells; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |
| Dispel Evil | C5 | Expert, Companion, RC | Expert -> Clerical and Magic-User Spell Expansions -> Fifth-Level Clerical Spells; Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Fifth-Level Cleric Spells; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |
| Earthquake | C7 | Companion, Master, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Seventh-Level Cleric Spells; Master -> Seventh-Level Cleric Spells; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |
| Find the Path | C6 | Expert, Companion, RC | Expert -> Clerical and Magic-User Spell Expansions -> Sixth-Level Clerical Spells; Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Sixth-Level Cleric Spells; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |
| Holy Word | C7 | Companion, Master, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Seventh-Level Cleric Spells; Master -> Seventh-Level Cleric Spells; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |
| Insect Plague | C5 | Expert, Companion, RC | Expert -> Clerical and Magic-User Spell Expansions -> Fifth-Level Clerical Spells; Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Fifth-Level Cleric Spells; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |
| Quest | C5 | Expert, Companion, RC | Expert -> Clerical and Magic-User Spell Expansions -> Fifth-Level Clerical Spells; Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Fifth-Level Cleric Spells; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |
| Raise Dead | C5 | Expert, Companion, RC | Expert -> Clerical and Magic-User Spell Expansions -> Fifth-Level Clerical Spells; Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Fifth-Level Cleric Spells; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |
| Finger of Death | C5 | Master, RC | Master -> Master Set spell list (R 60'); RC -> RC: Reverse Spell Synthesized Notes; note: Expert embeds death-ray mechanics (R 60', save vs. death ray) within Raise Dead (Expert Spell Expansions); Companion embeds undead-cure (3-30 hp for 10+ HD undead) within Raise Dead (High-Level Cleric Spell Material) | spell | ✓ | yes |
| Raise Dead Fully | C7 | Companion, Master, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Seventh-Level Cleric Spells; Master -> Seventh-Level Cleric Spells; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |
| Restore | C7 | Companion, Master, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Seventh-Level Cleric Spells; Master -> Seventh-Level Cleric Spells; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |
| Speak with Monsters | C6 | Expert, Companion, RC | Expert -> Clerical and Magic-User Spell Expansions -> Sixth-Level Clerical Spells; Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Sixth-Level Cleric Spells; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |
| Truesight | C5 | Companion, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Fifth-Level Cleric Spells; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |
| Word of Recall | C6 | Expert, Companion, RC | Expert -> Clerical and Magic-User Spell Expansions -> Sixth-Level Clerical Spells; Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Sixth-Level Cleric Spells; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |

#### Arcane

| Classic Name | Class(es)/Spell-level | Source Book(s) | Staging Anchor / Section | Type | Ch06 Import | osr: imported |
| --- | --- | --- | --- | --- | --- | --- |
| Contact Outer Plane | MU5 | Companion, Immortals, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Fifth-Level Magic-User Spells; Immortals -> Section 3: Immortal Magic -> Explanation of Terms, Charts S1-S4 -> Contact Outer Plane; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Charm Plant | MU7 | Companion, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Seventh-Level Magic-User Spells; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Create Normal Monsters | MU7 | Companion, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Seventh-Level Magic-User Spells; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Summon Object | MU7 | Companion, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Seventh-Level Magic-User Spells; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Sword | MU7 | Companion, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Seventh-Level Magic-User Spells; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Teleport any Object | MU7 | Companion, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Seventh-Level Magic-User Spells; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |

#### Item And Interface Effects

| Classic Name | Class(es)/Spell-level | Source Book(s) | Staging Anchor / Section | Type | Ch06 Import | osr: imported |
| --- | --- | --- | --- | --- | --- | --- |
| Communication |  | Companion, RC | Companion -> Spell-Adjacent Rings, Rods, and Miscellaneous Magic Items -> Scrolls; RC -> Scrolls | item-effect | — | - |
| Creation |  | Companion, RC | Companion -> Spell-Adjacent Rings, Rods, and Miscellaneous Magic Items -> Scrolls; RC -> Scrolls | item-effect | — | - |
| Delay |  | Companion, RC | Companion -> Spell-Adjacent Rings, Rods, and Miscellaneous Magic Items -> Scrolls; RC -> Scrolls | item-effect | — | - |
| Equipment |  | Companion, RC | Companion -> Spell-Adjacent Rings, Rods, and Miscellaneous Magic Items -> Scrolls; RC -> Scrolls | item-effect | — | - |
| Illumination |  | Companion, RC | Companion -> Spell-Adjacent Rings, Rods, and Miscellaneous Magic Items -> Scrolls; RC -> Scrolls | item-effect | — | - |
| Mages |  | Companion, RC | Companion -> Spell-Adjacent Rings, Rods, and Miscellaneous Magic Items -> Scrolls; RC -> Scrolls | item-effect | — | - |
| Mapping |  | Companion, RC | Companion -> Spell-Adjacent Rings, Rods, and Miscellaneous Magic Items -> Scrolls; RC -> Scrolls | item-effect | — | - |
| Portals |  | Companion, RC | Companion -> Spell-Adjacent Rings, Rods, and Miscellaneous Magic Items -> Scrolls; RC -> Scrolls | item-effect | — | - |
| Questioning |  | Companion, RC | Companion -> Spell-Adjacent Rings, Rods, and Miscellaneous Magic Items -> Scrolls; RC -> Scrolls | item-effect | — | - |
| Repetition |  | Companion, RC | Companion -> Spell-Adjacent Rings, Rods, and Miscellaneous Magic Items -> Scrolls; RC -> Scrolls | item-effect | — | - |
| Seeing |  | Companion, RC | Companion -> Spell-Adjacent Rings, Rods, and Miscellaneous Magic Items -> Scrolls; RC -> Scrolls | item-effect | — | - |
| Shelter |  | Companion, RC | Companion -> Spell-Adjacent Rings, Rods, and Miscellaneous Magic Items -> Scrolls; RC -> Scrolls | item-effect | — | - |
| Spell Catching |  | Companion, RC | Companion -> Spell-Adjacent Rings, Rods, and Miscellaneous Magic Items -> Scrolls; RC -> Scrolls | item-effect | — | - |
| Trapping |  | Companion, RC | Companion -> Spell-Adjacent Rings, Rods, and Miscellaneous Magic Items -> Scrolls; RC -> Scrolls | item-effect | — | - |
| Truth |  | Companion, RC | Companion -> Spell-Adjacent Rings, Rods, and Miscellaneous Magic Items -> Scrolls; RC -> Scrolls | item-effect | — | - |
| Truthfulness |  | Companion, RC | Companion -> Spell-Adjacent Rings, Rods, and Miscellaneous Magic Items -> Rings; RC -> Chapter 16 Item Description Catalog -> Rings | item-effect | — | - |
| Truthlessness |  | Companion, RC | Companion -> Spell-Adjacent Rings, Rods, and Miscellaneous Magic Items -> Rings; RC -> Chapter 16 Item Description Catalog -> Rings | item-effect | — | - |
| Ring of Elemental Adaptation |  | Companion, RC | Companion -> Spell-Adjacent Rings, Rods, and Miscellaneous Magic Items -> Rings; RC -> Chapter 16 Item Description Catalog -> Rings | item-effect | — | - |
| Ring of Holiness |  | Companion, RC | Companion -> Spell-Adjacent Rings, Rods, and Miscellaneous Magic Items -> Rings; RC -> Chapter 16 Item Description Catalog -> Rings | item-effect | — | - |
| Ring of Life Protection |  | Companion, RC | Companion -> Spell-Adjacent Rings, Rods, and Miscellaneous Magic Items -> Rings; RC -> Chapter 16 Item Description Catalog -> Rings | item-effect | — | - |
| Ring of Memory |  | Companion, RC | Companion -> Spell-Adjacent Rings, Rods, and Miscellaneous Magic Items -> Rings; RC -> Chapter 16 Item Description Catalog -> Rings | item-effect | — | - |
| Ring of Remedies |  | Companion, RC | Companion -> Spell-Adjacent Rings, Rods, and Miscellaneous Magic Items -> Rings; RC -> Chapter 16 Item Description Catalog -> Rings | item-effect | — | - |
| Ring of Spell Eating |  | Companion, RC | Companion -> Spell-Adjacent Rings, Rods, and Miscellaneous Magic Items -> Rings; RC -> Chapter 16 Item Description Catalog -> Rings | item-effect | — | - |
| Ring of Survival |  | Companion, RC | Companion -> Spell-Adjacent Rings, Rods, and Miscellaneous Magic Items -> Rings; RC -> Chapter 16 Item Description Catalog -> Rings | item-effect | — | - |
| Staff of Dispelling |  | Companion, RC | Companion -> Spell-Adjacent Rings, Rods, and Miscellaneous Magic Items -> Wands, Staves, and Rods; RC -> Chapter 16 Item Description Catalog -> Wands, Staves, and Rods | item-effect | — | - |
| Staff of the Druids |  | Companion, RC | Companion -> Spell-Adjacent Rings, Rods, and Miscellaneous Magic Items -> Wands, Staves, and Rods; RC -> Chapter 16 Item Description Catalog -> Wands, Staves, and Rods | item-effect | — | - |
| Staff of an Element |  | Companion, RC | Companion -> Spell-Adjacent Rings, Rods, and Miscellaneous Magic Items -> Wands, Staves, and Rods; RC -> Chapter 16 Item Description Catalog -> Wands, Staves, and Rods | item-effect | — | - |
| Staff of Harming |  | Companion, RC | Companion -> Spell-Adjacent Rings, Rods, and Miscellaneous Magic Items -> Wands, Staves, and Rods; RC -> Chapter 16 Item Description Catalog -> Wands, Staves, and Rods | item-effect | — | - |
| Rod of Health |  | Companion, RC | Companion -> Spell-Adjacent Rings, Rods, and Miscellaneous Magic Items -> Wands, Staves, and Rods; RC -> Chapter 16 Item Description Catalog -> Wands, Staves, and Rods | item-effect | — | - |
| Rod of the Wyrm |  | Companion, RC | Companion -> Spell-Adjacent Rings, Rods, and Miscellaneous Magic Items -> Wands, Staves, and Rods; RC -> Chapter 16 Item Description Catalog -> Wands, Staves, and Rods | item-effect | — | - |
| Quill of Copying |  | Companion, RC | Companion -> Spell-Adjacent Rings, Rods, and Miscellaneous Magic Items -> Miscellaneous Items; RC -> Chapter 16 Item Description Catalog -> Miscellaneous Items | item-effect | — | - |
| Talisman of Elemental Travel |  | Companion, RC | Companion -> Spell-Adjacent Rings, Rods, and Miscellaneous Magic Items -> Miscellaneous Items; RC -> Chapter 16 Item Description Catalog -> Miscellaneous Items | item-effect | — | - |
| Slate of Identification |  | Companion, RC | Companion -> Spell-Adjacent Rings, Rods, and Miscellaneous Magic Items -> Miscellaneous Items; RC -> Chapter 16 Item Description Catalog -> Miscellaneous Items | item-effect | — | - |

#### Druid

| Classic Name | Class(es)/Spell-level | Source Book(s) | Staging Anchor / Section | Type | Ch06 Import | osr: imported |
| --- | --- | --- | --- | --- | --- | --- |
| Anti-Animal Shell | Dr6 | Companion, Master, RC | Companion -> Druid Spell Material; Master -> Druid Spell Material; RC -> Druidic Spells List and Spell Descriptions | spell | ✓ | yes |
| Anti-Plant Shell | Dr5 | Companion, Master, RC | Companion -> Druid Spell Material; Master -> Druid Spell Material; RC -> Druidic Spells List and Spell Descriptions | spell | ✓ | yes |
| Call Lightning | Dr3 | Companion, Master, RC | Companion -> Druid Spell Material; Master -> Druid Spell Material; RC -> Druidic Spells List and Spell Descriptions | spell | ✓ | yes |
| Control Temperature 10' Radius | Dr4 | Companion, Master, RC | Companion -> Druid Spell Material; Master -> Druid Spell Material; RC -> Druidic Spells List and Spell Descriptions | spell | ✓ | yes |
| Control Winds | Dr5 | Companion, Master, RC | Companion -> Druid Spell Material; Master -> Druid Spell Material; RC -> Druidic Spells List and Spell Descriptions | spell | ✓ | yes |
| Creeping Doom | Dr7 | Companion, Master, RC | Companion -> Druid Spell Material; Master -> Druid Spell Material; RC -> Druidic Spells List and Spell Descriptions | spell | ✓ | yes |
| Faerie Fire | Dr1 | Companion, Master, RC | Companion -> Druid Spell Material; Master -> Druid Spell Material; RC -> Druidic Spells List and Spell Descriptions | spell | ✓ | yes |
| Hold Animal | Dr3 | Companion, Master, RC | Companion -> Druid Spell Material; Master -> Druid Spell Material; RC -> Druidic Spells List and Spell Descriptions | spell | ✓ | yes |
| Locate | Dr1 | Companion, Master, RC | Companion -> Druid Spell Material; Master -> Druid Spell Material; RC -> Druidic Spells List and Spell Descriptions | spell | ✓ | yes |
| Metal to Wood | Dr7 | Companion, Master, RC | Companion -> Druid Spell Material; Master -> Druid Spell Material; RC -> Druidic Spells List and Spell Descriptions | spell | ✓ | yes |
| Obscure | Dr2 | Companion, Master, RC | Companion -> Druid Spell Material; Master -> Druid Spell Material; RC -> Druidic Spells List and Spell Descriptions | spell | ✓ | yes |
| Pass Plant | Dr5 | Companion, Master, RC | Companion -> Druid Spell Material; Master -> Druid Spell Material; RC -> Druidic Spells List and Spell Descriptions | spell | ✓ | yes |
| Plant Door | Dr4 | Companion, Master, RC | Companion -> Druid Spell Material; Master -> Druid Spell Material; RC -> Druidic Spells List and Spell Descriptions | spell | ✓ | yes |
| Predict Weather | Dr1 | Companion, Master, RC | Companion -> Druid Spell Material; Master -> Druid Spell Material; RC -> Druidic Spells List and Spell Descriptions | spell | ✓ | yes |
| Produce Fire | Dr2 | Companion, Master, RC | Companion -> Druid Spell Material; Master -> Druid Spell Material; RC -> Druidic Spells List and Spell Descriptions | spell | ✓ | yes |
| Protection from Lightning | Dr4 | Companion, Master, RC | Companion -> Druid Spell Material; Master -> Druid Spell Material; RC -> Druidic Spells List and Spell Descriptions | spell | ✓ | yes |
| Summon Weather | Dr6 | Companion, Master, RC | Companion -> Druid Spell Material; Master -> Druid Spell Material; RC -> Druidic Spells List and Spell Descriptions | spell | ✓ | yes |
| Transport Through Plants | Dr6 | Companion, Master, RC | Companion -> Druid Spell Material; Master -> Druid Spell Material; RC -> Druidic Spells List and Spell Descriptions | spell | ✓ | yes |
| Warp Wood | Dr2 | Companion, Master, RC | Companion -> Druid Spell Material; Master -> Druid Spell Material; RC -> Druidic Spells List and Spell Descriptions | spell | ✓ | yes |
| Water Breathing | Dr3, MU3 | Companion, Master, RC | Companion -> Druid Spell Material; Master -> Druid Spell Material; RC -> Druidic and Magical Spells Lists and Spell Descriptions | spell | ✓ | yes |
| Weather Control | Dr7, MU6 | Companion, Master, RC | Companion -> Druid Spell Material; Master -> Druid Spell Material; RC -> Druidic and Magical Spells Lists and Spell Descriptions | spell | ✓ | yes |

### M - Master

#### Cleric And Druid

| Classic Name | Class(es)/Spell-level | Source Book(s) | Staging Anchor / Section | Type | Ch06 Import | osr: imported |
| --- | --- | --- | --- | --- | --- | --- |
| Detect Danger | Dr1 | Master, RC | Master -> Druid Spell Material; RC -> Druidic Spells List and Spell Descriptions | spell | ✓ | yes |
| Dissolve | Dr5, MU5 | Companion, Master, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Fifth-Level Magic-User Spells; Master -> Druid Spell Material; RC -> Druidic and Magical Spells Lists and Spell Descriptions | spell | ✓ | yes |
| Heat Metal | Dr2 | Master, RC | Master -> Druid Spell Material; RC -> Druidic Spells List and Spell Descriptions | spell | ✓ | yes |
| Protection from Poison | Dr3 | Master, RC | Master -> Druid Spell Material; RC -> Druidic Spells List and Spell Descriptions | spell | ✓ | yes |
| Summon Animals | Dr4 | Master, RC | Master -> Druid Spell Material; RC -> Druidic Spells List and Spell Descriptions | spell | ✓ | yes |
| Summon Elemental | Dr7 | Master, RC | Master -> Druid Spell Material; RC -> Druidic Spells List and Spell Descriptions | spell | ✓ | yes |
| Survival | C7, MU9 | Master, RC | Master -> Seventh-Level Cleric Spells; RC -> Clerical and Magical Spell Descriptions | spell | ✓ | yes |
| Travel | C7, MU8 | Master, RC | Master -> Seventh-Level Cleric Spells; Master -> Eighth-Level and Ninth-Level Magic-User Spells; RC -> Clerical and Magical Spell Descriptions | spell | ✓ | yes |
| Turn Wood | Dr6 | Master, RC | Master -> Druid Spell Material; RC -> Druidic Spells List and Spell Descriptions | spell | ✓ | yes |
| Wish | C7, MU9 | Master, RC | Master -> Seventh-Level Cleric Spells; Master -> Eighth-Level and Ninth-Level Magic-User Spells; RC -> Clerical and Magical Spell Descriptions | spell | ✓ | yes |
| Wizardry | C7 | Master, RC | Master -> Seventh-Level Cleric Spells; RC -> Clerical Spells List and Spell Descriptions | spell | ✓ | yes |

#### Arcane

| Classic Name | Class(es)/Spell-level | Source Book(s) | Staging Anchor / Section | Type | Ch06 Import | osr: imported |
| --- | --- | --- | --- | --- | --- | --- |
| Clone | MU8 | Master, RC | Master -> Eighth-Level Magic-User Spells; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Contingency | MU9 | Master, RC | Master -> Eighth-Level and Ninth-Level Magic-User Spells; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Create Any Monster | MU9 | Master, RC | Master -> Eighth-Level and Ninth-Level Magic-User Spells; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Create Magical Monsters | MU8 | Master, RC | Master -> Eighth-Level Magic-User Spells; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Dance | MU8 | Companion, Master, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Eighth-Level Magic-User Spells; Master -> Eighth-Level Magic-User Spells; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Explosive Cloud | MU8 | Companion, Master, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Eighth-Level Magic-User Spells; Master -> Eighth-Level Magic-User Spells; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Force Field | MU8 | Master, RC | Master -> Eighth-Level Magic-User Spells; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Gate | MU9 | Companion, Master, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Ninth-Level Magic-User Spells; Master -> Eighth-Level and Ninth-Level Magic-User Spells; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Heal | MU9 | Master, RC | Master -> Eighth-Level and Ninth-Level Magic-User Spells; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Immunity | MU9 | Master, RC | Master -> Eighth-Level and Ninth-Level Magic-User Spells; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Mass Charm | MU8 | Companion, Master, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Eighth-Level Magic-User Spells; Master -> Eighth-Level Magic-User Spells; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Maze | MU9 | Companion, Master, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Ninth-Level Magic-User Spells; Master -> Eighth-Level and Ninth-Level Magic-User Spells; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Meteor Swarm | MU9 | Companion, Master, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Ninth-Level Magic-User Spells; Master -> Eighth-Level and Ninth-Level Magic-User Spells; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Mind Barrier | MU8 | Companion, Master, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Eighth-Level Magic-User Spells; Master -> Eighth-Level Magic-User Spells; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Permanence | MU8 | Companion, Master, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Eighth-Level Magic-User Spells; Master -> Eighth-Level Magic-User Spells; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Polymorph Any Object | MU8 | Companion, Master, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Eighth-Level Magic-User Spells; Master -> Eighth-Level Magic-User Spells; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Power Word Blind | MU8 | Companion, Master, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Eighth-Level Magic-User Spells; Master -> Eighth-Level Magic-User Spells; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Power Word Kill | MU9 | Companion, Master, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Ninth-Level Magic-User Spells; Master -> Eighth-Level and Ninth-Level Magic-User Spells; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Prismatic Wall | MU9 | Master, RC | Master -> Eighth-Level and Ninth-Level Magic-User Spells; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Feeblemind | MU5 | Companion, Master, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Fifth-Level Magic-User Spells; Master -> Artifact Chapter Context and Witnesses; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Move Earth | MU6 | Companion, Master, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Sixth-Level Magic-User Spells; Master -> Non-Human Spellcasters and Special Spellcaster Procedures; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Reincarnation | MU6 | Companion, Master, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Sixth-Level Magic-User Spells; Master -> Non-Human Spellcasters and Special Spellcaster Procedures; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Telekinesis | MU5 | Companion, Master, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Fifth-Level Magic-User Spells; Master -> Artifact Chapter Context and Witnesses; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Wall of Iron | MU6 | Companion, Master, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Sixth-Level Magic-User Spells; Master -> Non-Human Spellcasters and Special Spellcaster Procedures; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Lore | MU7 | Companion, Master, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Seventh-Level Magic-User Spells; Master -> Artifact Chapter Context and Witnesses; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Magic Door | MU7 | Companion, Master, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Seventh-Level Magic-User Spells; Master -> Artifact Chapter Context and Witnesses; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Mass Invisibility | MU7 | Companion, Master, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Seventh-Level Magic-User Spells; Master -> Artifact Chapter Context and Witnesses; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Power Word Stun | MU7 | Companion, Master, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Seventh-Level Magic-User Spells; Master -> Artifact Chapter Context and Witnesses; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Reverse Gravity | MU7 | Companion, Master, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Seventh-Level Magic-User Spells; Master -> Artifact Chapter Context and Witnesses; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Statue | MU7 | Companion, Master, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Seventh-Level Magic-User Spells; Master -> Artifact Chapter Context and Witnesses; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Shapechange | MU9 | Master, RC | Master -> Eighth-Level and Ninth-Level Magic-User Spells; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Symbol | MU8 | Companion, Master, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Eighth-Level Magic-User Spells; Master -> Eighth-Level Magic-User Spells; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Timestop | MU9 | Master, RC | Master -> Eighth-Level and Ninth-Level Magic-User Spells; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |

#### Item And Interface Effects

| Classic Name | Class(es)/Spell-level | Source Book(s) | Staging Anchor / Section | Type | Ch06 Import | osr: imported |
| --- | --- | --- | --- | --- | --- | --- |
| Control Animals |  | Master | Master -> Artifact Chapter Context and Witnesses | item-effect | — | - |
| Control Plants |  | Master | Master -> Artifact Chapter Context and Witnesses | item-effect | — | - |
| Control Lesser Undead |  | Master | Master -> Artifact Chapter Context and Witnesses | item-effect | — | - |
| Control Greater Undead |  | Master | Master -> Artifact Chapter Context and Witnesses | item-effect | — | - |
| Control Giants |  | Master | Master -> Artifact Chapter Context and Witnesses | item-effect | — | - |
| Control Dragons |  | Master | Master -> Artifact Chapter Context and Witnesses | item-effect | — | - |
| Control Humans |  | Master | Master -> Artifact Chapter Context and Witnesses | item-effect | — | - |
| Anti-Magic Ray |  | Master | Master -> Artifact Chapter Context and Witnesses | item-effect | — | - |
| Plane Travel |  | Master | Master -> Artifact Chapter Context and Witnesses | item-effect | — | - |
| Life Trapping |  | Expert, Master, RC | Expert -> Scrolls, Rings, Wands, Staves, Rods, and Spell-Adjacent Treasure Text -> Miscellaneous Magic Items; Master -> Artifact Chapter Context and Witnesses; RC -> Chapter 16 Item Description Catalog -> Miscellaneous Magic Items | item-effect | — | - |
| Mapmaking |  | Master | Master -> Artifact Chapter Context and Witnesses | item-effect | — | - |
| Open Mind |  | Master | Master -> Artifact Chapter Context and Witnesses | item-effect | — | - |
| Turn Undead Bonus |  | Master | Master -> Artifact Chapter Context and Witnesses | item-effect | — | - |
| Spell Damage Bonus |  | Master | Master -> Artifact Chapter Context and Witnesses | item-effect | — | - |
| Choose Best Option / Choose Option |  | Master | Master -> Artifact Chapter Context and Witnesses | item-effect | — | - |

#### Procedures

| Classic Name | Class(es)/Spell-level | Source Book(s) | Staging Anchor / Section | Type | Ch06 Import | osr: imported |
| --- | --- | --- | --- | --- | --- | --- |
| Artifact Activation |  | Master | Master -> Artifact Chapter Context and Witnesses | procedure | — | - |
| Artifact Charges And Recharge |  | Master | Master -> Artifact Chapter Context and Witnesses | procedure | — | - |
| Artifact Intelligence And Auto-Defense |  | Master | Master -> Artifact Chapter Context and Witnesses | procedure | — | - |
| Artifact Handicaps And Penalties |  | Master, RC | Master -> Artifact Chapter Context and Witnesses; RC -> Artifacts | procedure | — | - |
| Attacking An Artifact |  | Master, RC | Master -> Artifact Chapter Context and Witnesses; RC -> Artifacts | procedure | — | - |
| Destruction Of An Artifact |  | Master, RC | Master -> Artifact Chapter Context and Witnesses; RC -> Artifacts | procedure | — | - |
| Creating Artifacts |  | Master | Master -> Artifact Chapter Context and Witnesses | procedure | — | - |
| Artifact Discovery And Power Reveal |  | Master | Master -> Artifact Chapter Context and Witnesses | procedure | — | - |
| Artifact Command Word / Thought / Gesture Interfaces |  | Master | Master -> Artifact Chapter Context and Witnesses | procedure | — | - |
| Artifact Recharge Exceptions And Paid Recharge |  | Master | Master -> Artifact Chapter Context and Witnesses | procedure | — | - |
| Artifact Conditional Revelation Triggers |  | Master | Master -> Artifact Chapter Context and Witnesses | procedure | — | - |
| Artifact Autonomous Service / Refusal |  | Master | Master -> Artifact Chapter Context and Witnesses | procedure | — | - |

### I - Immortals

No unique Phase 1 spell rows are currently Immortals-primary; Immortals remains represented as a co-source lane within relevant rows.

#### Procedures

| Classic Name | Class(es)/Spell-level | Source Book(s) | Staging Anchor / Section | Type | Ch06 Import | osr: imported |
| --- | --- | --- | --- | --- | --- | --- |
| Immortal Power Point Conversion And Bookkeeping |  | Immortals | Immortals -> Sections 1-2: Power Point Conversion, Rank Progression, Sphere Choice, and Recovery Context -> Section 1: Changes | procedure | — | - |
| Immortal Rank And Level Frame |  | Immortals | Immortals -> Sections 1-2: Power Point Conversion, Rank Progression, Sphere Choice, and Recovery Context -> Section 1: Changes | procedure | — | - |
| Immortal GT Advancement Costs And Gate |  | Immortals | Immortals -> Sections 1-2: Power Point Conversion, Rank Progression, Sphere Choice, and Recovery Context -> increasing ability scores, rank costs, and GT advancement gate | procedure | — | - |
| Immortal Sphere Bias And Recovery |  | Immortals | Immortals -> Sections 1-2: Power Point Conversion, Rank Progression, Sphere Choice, and Recovery Context -> Section 2: New Characters Information | procedure | — | - |
| Immortal Sphere-Factor Cost Model |  | Immortals | Immortals -> Section 3: Immortal Magic -> Power Cost | procedure | — | - |
| Immortal Magical Effect Index (S1-S4) |  | Immortals | Immortals -> Section 3: Immortal Magic -> General Notes, Charts S1-S4 | procedure | — | - |
| Immortal Caster Level Rule |  | Immortals | Immortals -> Section 3: Immortal Magic -> Caster Level | procedure | — | - |
| Immortal Range / Duration Scaling |  | Immortals | Immortals -> Section 3: Immortal Magic -> Changing Range and Duration | procedure | — | - |
| Immortal Conjuring And Summoning Limits |  | Immortals | Immortals -> Section 3: Immortal Magic -> Conjuring and Summoning | procedure | — | - |
| Immortal Damage Scaling And Averaging |  | Immortals | Immortals -> Section 3: Immortal Magic -> Damage | procedure | — | - |
| Immortal Mental Effect Resolution |  | Immortals | Immortals -> Section 3: Immortal Magic -> Mental Effects | procedure | — | - |
| Immortal Limits On Use |  | Immortals | Immortals -> Section 3: Immortal Magic -> Limits on Use | procedure | — | - |
| Immortal Undead / Entropy Curing |  | Immortals | Immortals -> Section 3: Immortal Magic -> Undead Curing | procedure | — | - |
| Immortal Effect Explanation Overrides |  | Immortals | Immortals -> Section 3: Immortal Magic -> Explanation of Terms, Charts S1-S4 | procedure | — | - |

### RC - Rules Cyclopedia

#### Spells

| Classic Name | Class(es)/Spell-level | Source Book(s) | Staging Anchor / Section | Type | Ch06 Import | osr: imported |
| --- | --- | --- | --- | --- | --- | --- |
| Analyze | MU1 | RC | RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Entangle | MU2 | RC | RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Create Air | MU3 | RC | RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Clothform | MU4 | RC | RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Stoneform | MU6 | RC | RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Woodform | MU5 | RC | RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Delayed Blast Fireball | MU7 | Companion, Master, RC | Companion -> High-Level Cleric, Druid, and Magic-User Spell Material -> Seventh-Level Magic-User Spells; Master -> Artifact Chapter Context and Witnesses; RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Ironform | MU7 | RC | RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |
| Steelform | MU8 | RC | RC -> Magical Spells List and Spell Descriptions | spell | ✓ | yes |

#### Item And Interface Effects

No RC-primary Phase 1 item/interface rows are currently parked here; item-side `RC` evidence is carried as co-source context on the Basic, Expert, and Companion buckets.

#### Procedures

| Classic Name | Class(es)/Spell-level | Source Book(s) | Staging Anchor / Section | Type | Ch06 Import | osr: imported |
| --- | --- | --- | --- | --- | --- | --- |
| Charm Person Spell Resolution |  | RC | RC -> Spell-Adjacent Procedures and DM Spell Doctrine -> Charm Person Spells | procedure | — | - |
| Damage to Magical Items |  | Companion, RC | Companion -> Spell-Adjacent Rings, Rods, and Miscellaneous Magic Items -> Damage To Magic Items; RC -> Spell-Adjacent Procedures and DM Spell Doctrine -> Damage to Magical Items | procedure | — | - |
| Haste Speed Stacking Rules |  | RC | RC -> Spell-Adjacent Procedures and DM Spell Doctrine -> Haste Spell | procedure | — | - |
| Magic-User Starting Spell Choice |  | RC | RC -> Spell-Adjacent Procedures and DM Spell Doctrine -> Magic-User Spell Choice | procedure | — | - |
| Experience from Spells and Enchanted Items |  | RC | RC -> Spell Research -> Experience from Spells and Enchanted Items | procedure | — | - |

## Deferred Gear Chapter Bundle Notes

- Staff of Power bundle to resolve in the next pass:
	- `Fireball`
	- `Lightning Bolt`
	- `Ice Storm`
	- `Continual Light`
	- `Telekinesis`
- Staff of Wizardry bundle to resolve in the next pass:
	- `Invisibility`
	- `Passwall`
	- `Web`
	- `Conjure Elemental`
	- whirlwind / cone of paralyzation riders
- Staff of Elemental Power still needs a dedicated bridge note pass for effect naming and elemental counter-negation phrasing.
- Expert ECM item coverage status (2026-03-23): `Ring of Spell Turning` and `Ring of Spell Eating` are both now in Phase 1. Expert wands (Wand of Cold, Wand of Fear, Wand of Fire Balls, Wand of Illusion, Wand of Lightning Bolts, Wand of Negation, Wand of Polymorphing, etc.) are treated as delivery interfaces for existing spell families and do not receive separate Phase 1 rows; `Wand of Negation` (cancels one other wand or staff effect for 1 round) is the only Expert wand with a distinct ECM-adjacent interface, and should be noted if the ECM family needs deeper item-interface coverage in Chapter 05.