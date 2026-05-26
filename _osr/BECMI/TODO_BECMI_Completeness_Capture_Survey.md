# EPIC: Completeness Capture — Cross-Corpus Spell Text Survey

**Status:** REOPENED — Stories 7–8 added 2026-04-03; Stories 9–11 added 2026-04-03; Story 7 COMPLETE; Stories 8–11 TODO  
**Date opened:** 2026-04-03  
**Branch:** feature/osr-power-text

---

## Purpose

Verify by direct PDF search that every rules-bearing mention of each canonical spell name in all 6 BECMI/RC source books has been captured in the staged corpus — surfacing anything the section-scoped extraction approach missed.

The existing staging scripts extract by *section*: they know where the spell description chapters are and pull those blocks. But BECMI/RC contains spell-relevant rules text scattered across DM procedure chapters, monster entries, magic item descriptions, combat and anti-magic procedure chapters, and adventure support appendices. None of these were targeted by the original extraction. Some is incidental flavor; some carries genuine rules mechanics — and we currently don't know which without looking.

**Known unknown unknowns already in evidence:**
- RC Ch.13 "Charm Person Spells" — full DM-facing duration rules with save-frequency table by Intelligence
- RC "Sleep and Unconsciousness" — procedure note that could extend the Sleep power card
- RC Wand of Fireballs item entry — activation mechanics referencing Fireball by name
- RC Master anti-magic and area-spell procedure sections — reference ≥15 spell names with new mechanics
- Immortals PP-damage scaling section — references several offensive spells with Immortal-tier scaling

---

## Scope

| In scope | Out of scope |
| --- | --- |
| 6 BECMI/RC PDFs: Basic, Expert, Companion, Master, Immortals, RC | Men & Magic, Greyhawk, Holmes, OD&D Family (no staging infrastructure) |
| All 196 spell recognizer rows marked `✓` in crosswalk | 4 Master-only artifact procedures |
| Standalone reversals: Finger of Death, Darkness, Continual Darkness (search by own name) | Purely incidental mentions: NPC loadout lists, treasure table rows with no rules text |
| All known aliases: Fire Ball / Fireball, Pass-Wall / Passwall, Polymorph Others / Other, etc. | Creature-specific spellcaster scan lines (e.g. "casts as MU8") |

## Hit Classification Tiers

| Tier | Description | Action |
| --- | --- | --- |
| `toc` | Dotted-line table of contents / index page entry | Auto-skip |
| `spell-list` | Multi-column spell list row | Auto-skip |
| `primary` | Main spell description block (already staged) | Auto-skip |
| `cross-ref` | "Can be removed by X" / "immune to X" in another spell body — no new mechanic | Flag only if new rule present |
| `rules-note` | Standalone DM procedure section adding mechanics, save tables, duration rules, class interactions | **Capture candidate** |
| `item-monster` | Monster immunity/ability or item activation with new spell behavior | **High-value capture candidate** |

---

## Stories and Sub-Tasks

### Story 1 — Extraction Infrastructure ✓ DONE

**Goal:** Build search-ready full-corpus text extractions of all 6 BECMI/RC PDFs and validate they are searchable.

**Acceptance:** All 6 extraction files exist in `_becmi/extractions/`, each returns hits for at least 5 known spell names, word counts are within expected range per book.

| Sub-task | Tasked Spirit | Status | Notes |
| --- | --- | --- | --- |
| 1a. Extract all 6 PDFs to `_becmi/extractions/` using `pdftotext -layout` | `CorpusBuild(Extractor)` | ✓ | Names: `basic_full.txt`, `expert_full.txt`, `companion_full.txt`, `master_full.txt`, `immortals_full.txt`, `rc_full.txt` |
| 1b. Post-extraction sanity check: verify line counts, confirm 10 known spell names resolve per file, flag PDF-quality issues | `CorpusCheck(Validator)` | ✓ | Python spot-check script |
| 1c. Document known extraction artifacts (multi-column interleave, truncated lines, soft-hyphen breaks) as filter notes | `ArtifactLog(Annotator)` | ✓ | Written to `_todo/BECMI/scripts/survey_spell_completeness.py` docstring |

---

### Story 2 — Survey Script and Classification Engine ✓ DONE

**Goal:** Write `_todo/BECMI/scripts/survey_spell_completeness.py` — searches the corpus extractions × canonical spell names × existing staging content, outputs a structured hit report with auto-classification.

**Acceptance:** Script runs cleanly on all 6 books; ToC/index noise auto-classified; primary-block hits identified and skipped; residual output is triageable by a human.

| Sub-task | Tasked Spirit | Status | Notes |
| --- | --- | --- | --- |
| 2a. Core search loop: for each spell name + aliases × each source file, find all line-number hits with ±6 line context window | `ScanRig(Builder)` | ✓ | Reuse `norm`, `spell_aliases` from `build_becmi_spell_staging_multi.py` |
| 2b. Noise filters: auto-classify ToC lines, spell-list table rows, index page hits | `NoiseCut(Classifier)` | ✓ | Regex + heuristic classifiers on context window |
| 2c. Already-staged filter: test whether hit context overlaps text already in the individual lane staging files | `StagedCheck(Deduper)` | ✓ | Sliding-window text match against `_todo/BECMI/TODO_BECMI_Spell_Material_Staging_*.md` |
| 2d. Alias + fuzzy-match: Fire Ball/Fireball, Pass-Wall/Passwall, standalone reversals (Finger of Death, Darkness, Continual Darkness) | `AliasMap(Resolver)` | ✓ | Extends existing `spell_aliases` dict; records match form in hit report |
| 2e. Output: Markdown table hit report; columns: Spell \| Source Book \| Line # \| Auto-Class \| Context Preview \| Staging Match \| Decision; `check`/`write` modes; `--spell`, `--book`, `--min-class`, `--module` flags | `HitLog(Reporter)` | ✓ | `--write` outputs to `_todo/BECMI/TODO_Completeness_Survey_Hits.md` |

---

### Story 3 — Survey Run: Basic + Expert ✓ DONE

**Goal:** Run the survey over Basic and Expert; classify all residual hits as `captured`, `incidental`, or `new-rule-gap`.

**Scale estimate:** ~35 spells across B/E; expected residual hits post-noise-cut: ~10–25 total.

| Sub-task | Tasked Spirit | Status | Notes |
| --- | --- | --- | --- |
| 3a. Run `survey_spell_completeness.py --book basic,expert --min-class cross-ref` | `BECMIScan_BE(Scanner)` | ✓ | 670 hits; noise-cut to ~25 residual |
| 3b. Triage all residual B/E hits; classify; annotate Decision column | `BETriage_BE(Triager)` | ✓ | 1 `new-rule-gap` identified (Basic Charm Person DM procedure); remainder incidental |
| 3c. For any `new-rule-gap` hits: identify staging file target, section anchor, draft staging text block | `BEDraft_BE(Drafter)` | ✓ | Staged to `TODO_BECMI_Spell_Material_Staging_Basic.md` — Intelligence save-frequency table (High=1 day / Average=1 week / Low=1 month) + shapechange auto-break; source `basic_full.txt` L5516–5545. Operator-approved. |

---

### Story 4 — Survey Run: Companion + Master ✓ DONE

**Goal:** Run the survey over Companion and Master; classify all residual hits.

**Scale estimate:** ~80 spells across C/M; expected residual hits: ~30–60. Master anti-magic chapter alone references ≥15 spell names.

| Sub-task | Tasked Spirit | Status | Notes |
| --- | --- | --- | --- |
| 4a. Run `survey_spell_completeness.py --book companion,master --min-class cross-ref` | `BECMIScan_CM(Scanner)` | ✓ | 657 hits |
| 4b. Triage all residual C/M hits | `BETriage_CM(Triager)` | ✓ | 1 `new-rule-gap` identified: Companion Weapon Talent table (item-monster tier). Master anti-magic/procedure hits classified incidental (already staged in prior pass). |
| 4c. For any `new-rule-gap` hits: draft staging text blocks | `BEDraft_CM(Drafter)` | ✓ | Staged to `TODO_BECMI_Spell_Material_Staging_Companion.md` — 5-talent verbatim block (Breathing, Charming, Finding, Slowing [no Save], Speeding); source `companion_full.txt` L6628–6653. Operator-approved. |

---

### Story 5 — Survey Run: Immortals + RC ✓ DONE

**Goal:** Run the survey over Immortals and RC; classify all residual hits.

**Scale estimate:** RC has 20,841 lines; Dispel Magic alone has 49 hits. Residual RC hits post-noise-cut: ~60–120. Immortals: ~20–35. This is the longest triage session.

**Known high-priority RC targets:**
- Ch.13 "Charm Person Spells" subsection (Duration by Intelligence table + DM procedure)
- "Sleep and Unconsciousness" section
- Wand of Fireballs item entry (new activation mechanics)
- Master anti-magic and area-spell procedure sections (reference ≥15 spell names)
- Immortals PP-damage scaling section (references several offensive spells)

| Sub-task | Tasked Spirit | Status | Notes |
| --- | --- | --- | --- |
| 5a. Run `survey_spell_completeness.py --book rc --min-class cross-ref` | `RCScan(Scanner)` | ✓ | 1,007 hits |
| 5b. Triage RC residual hits in module batches | `RCTriage(Triager)` | ✓ | 73 residual hits classified; all incidental. RC Dispel Magic / Enchanted Vessel procedure (L18814–18833) identified as genuine gap but backlisted to `_todo/ftls/TODO_Magitech_Fantascience_Chapter05.md` (B1) — belongs to future Magic Items/Artifacts Epic. |
| 5c. Run `survey_spell_completeness.py --book immortals --min-class cross-ref` | `ImmScan(Scanner)` | ✓ | 474 hits |
| 5d. Triage Immortals residual hits | `ImmTriage(Triager)` | ✓ | 66 residual hits classified; all incidental (Immortal power lists, PP framing noise). 0 new-rule-gaps. |
| 5e. Cross-book dedup: RC hits duplicating earlier-lane staged content → `cross-book-dupe` not `new-rule-gap` | `XBookDedup(Deduper)` | ✓ | Performed inline during triage; no cross-book dupes requiring new classification. |

---

### Story 7 — List-vs-Description Convention Audit (Companion + Master + Expert) ☐ TODO

**Goal:** Document the "list-only" convention across all staging lanes: identify every spell that appears in a level's spell list but has NO description body in that same book. For each list-only entry, record the source lane(s) where a verbatim description IS present. Annotate the affected staging files with provenance notes matching the pattern established at Companion 6th-level MU (confirmed 2026-04-03).

**Background:** Companion page 21 (PDF p.23/104) confirmed that the Companion Set describes ONLY spells new to Companion tier; spells first introduced in Basic/Expert are listed but not re-described. The same convention is expected in Master (lists all available MU/Cleric spells but only describes new-to-Master ones) and may apply in Expert as well. This is intentional source-book design, not an extraction failure.

**Scale estimate:** ~3–5 levels per book × 2–3 books; estimated 15–40 list-only spell entries to trace across Basic/Expert/RC lanes for confirmation.

| Sub-task | Tasked Spirit | Status | Notes |
| --- | --- | --- | --- |
| 7a. Audit Companion staging: for each spell level with a description section, compare the spell list entries against the description bodies present; document list-only entries with source-lane pointer | `CompConvention(Auditor)` | ✓ DONE 2026-04-03 | **Two categories found:**<br>**List-only by design (20 entries):** Cleric 5th (5: Commune, Create Food, Dispel Evil, Insect Plague, Quest*), Cleric 6th (3: Find the Path, Speak with Monsters*, Word of Recall), MU 5th (8: Animate Dead, Cloudkill, Conjure Elemental, Hold Monster*, Magic Jar, Pass-Wall, Teleport, Wall of Stone), MU 6th (8, previously confirmed).<br>**Extraction gaps — in PDF, not in staging (13 bodies + 1 ref):** Cleric 6th: Cureall (raw ~L836); Create Normal Animals body truncated. Cleric 7th: all 4 (Earthquake, Holy Word, Raise Dead Fully*, Restore*, raw ~L862–900). Druid 5th–7th: all 9 (Anti-Plant Shell, Control Winds, Pass Plant, Anti-Animal Shell, Transport Through Plants, Summon Weather, Creeping Doom, Metal to Wood, Weather Control ref, raw ~L1050–L1128).<br>All 5 level-boundary annotations written to `TODO_BECMI_Spell_Material_Staging_Companion.md`. |
| 7b. Audit Master staging: apply same comparison pass | `MasterConvention(Auditor)` | ✓ DONE 2026-04-03 | **Master convention is EXPLICIT in source:** all spell list entries that defer to earlier sets are labeled with "(C-page)" Companion cross-references directly in the list. No hidden list-only omissions. Master-new spells are labeled "(described below)" or "(page X)". All 7 Druid new spells (Detect Danger, Heat Metal, Protection from Poison, Summon Animals, Dissolve*, Turn Wood, Summon Elemental), all 4 Cleric 7th new spells (Survival, Travel, Wish, Wizardry), all 4 MU 8th new spells (Clone, Create Magical Monsters, Force Field, Travel), and all 8 MU 9th new spells (Contingency, Create Any Monster, Heal, Immunity, Prismatic Wall, Shapechange, Timestop, Wish) confirmed present and complete in staging. **No annotation patches required for Master.** |
| 7c. Audit Expert staging: check whether Expert duplicates Basic descriptions or follows same convention | `ExpertConvention(Auditor)` | ✓ DONE 2026-04-03 | Expert convention is **explicitly documented in the staging file itself** (extraction note at L2830): 1st and 2nd level MU spells list-only in Expert — descriptions remain as in Basic, reversal notes only provided. All Expert-new spells (MU 3rd–6th, Cleric 2nd–6th) confirmed present with full description bodies. 3rd-level MU descriptions split between main section (L780–911: Fly, Haste*, Hold Person*, Infravision, Invisibility 10' radius, Lightning Bolt, Protection from Evil 10' Radius, Protection from Normal Missiles, Water Breathing) and post-list prose block (L2636+: Clairvoyance, Dispel Magic, Fire Ball); split is intentional and explained in extraction note at L2603. **No annotation patches required for Expert.** |
| 7d. Annotate affected staging files with confirmed provenance notes (format matching Companion 6th-level MU note added 2026-04-03) | `ProvenancePatch(Annotator)` | ✓ DONE 2026-04-03 | Companion staging patched with 5 boundary annotations: Cleric 7th extraction gap (L53), Cleric 5th 3/8+5 list-only (L55), Cleric 6th status per entry including Create Normal Animals truncation (L98–100, L154), Druid 5th–7th extraction gaps (L156), MU 5th 4/12+8 list-only (L775). Master and Expert already self-documenting — no patches needed. |

---

### Story 8 — Named Spell Source Coverage Map ✓ 8a/8b DONE — 8c/8d/8e pending

**Goal:** For every Named spell in the 196-row crosswalk, produce a source coverage map: which staging lanes supply a complete verbatim description body (primary), which supply list-only reference, which have no presence. Flag any spell where zero staging lanes contain a verbatim description, or where the only description is in a lane not yet confirmed by direct inspection.

**Background:** Story 7 will identify "list-only" lane entries per book. Story 8 uses that data to produce a complete per-spell source table — this is the ultimate goal: ensuring no Named spell in the crosswalk is orphaned (description available from zero staged sources). Spells that appear only in the RC re-compilation are the lowest-risk group; spells with Expert/Companion descriptions not yet confirmed against the PDF are the priority for direct inspection.

**Scale estimate:** 196 crosswalk rows × ~6 lanes; likely ~50–80 rows require manual confirmation once list-only entries are mapped in Story 7.

**8a/8b findings (2026-04-03):**
- `--coverage` mode added to `survey_spell_completeness.py`; report written to `_todo/BECMI/TODO_Completeness_Survey_Coverage.md`
- Totals by lane: Basic ✓34/~0/✗0 | Expert ✓79/~14/✗0 | Companion ✓66/~7/✗0 | Master ✓40/~36/✗0 | Immortals ✓0/~3/✗0 | RC ✓187/~0/✗0
- **Description-gap count: 0** — no spell with a traceable BECMI/RC source lane has zero descriptions staged; all "no-description" entries are Holmes-only source (`_norm_lane()` returns None) — not a gap in BECMI staging
- **Holmes-only/no-std-source: 9** (Dancing Lights, Enlargement, Audible Glamer, Clairaudience, Magic Mouth, Pyrotechnics, Ray of Enfeeblement, Slow, Strength) — covered via pre-add staging (`TODO_BECMI_Spell_Material_Staging.md`); low priority
- **Full-multi-lane (3+ lanes): 43** spells; includes all recently recovered Companion Cl7/D5-D7 entries
- **Master list-only gap: 36 spells** have list-only in Master lane — largest remaining capture target; not a risk item if RC has descriptions (which it does for all of them)
- Stories 11c/11d: Companion recovery confirmed ✓ (all Story 9/10 targets appear as ✓ desc in Companion lane)

| Sub-task | Tasked Spirit | Status | Notes |
| --- | --- | --- | --- |
| 8a. Build coverage table: for each of the 196 crosswalk spells, query each staging lane for presence of a verbatim description body (not just spell-list entry) | `CoverageMap(Builder)` | ✓ | `--coverage` flag added to `survey_spell_completeness.py`; report at `TODO_Completeness_Survey_Coverage.md` |
| 8b. Classify each crosswalk row: `full-multi-lane` (description in 3+ lanes), `primary-confirmed` (description in 1–2 lanes, directly inspected), `list-only-in-some-lanes` (description in ≥1 lane but list-only in others — OK), `description-gap` (zero verbatim descriptions across all staging lanes) | `CoverageClass(Classifier)` | ✓ | description-gap: 0; no-std-source: 9 (Holmes-only); full-multi-lane: 43; Master list-only: 36 — all RC-backed |
| 8c. For any `description-gap` entries: identify which non-BECMI/RC source might supply the description (Expert may describe some Basic spells if re-presented; RC re-compiles most) | `GapTrace(Tracer)` | ✓ | No BECMI/RC description-gap entries found; 9 Holmes-only spells are pre-add staging; no GapTrace action required |
| 8d. Stage verbatim text for any confirmed `description-gap` spells where a source exists | `GapFill(Drafter)` | N/A | No BECMI/RC description-gap entries; Holmes pre-add spells already in `TODO_BECMI_Spell_Material_Staging.md` |
| 8e. Update crosswalk confidence column for any rows where source coverage changes | `ConfidenceSync(Lorekeeper)` | ☐ | Master list-only gap (36 spells) and Immortals list-only (3 spells) — not a confidence risk (RC covers all); Stories 11c/11d: Companion lane confirmed ✓ for all recovered spells — operator review recommended before updating confidence column |

---

### Story 9 — Companion Extraction Gap: Cleric 6th Completion and Full Cleric 7th Recovery ✓ DONE

**Goal:** Recover the 5 missing description bodies from the Companion Cleric section (Create Normal Animals completion, Cureall, Earthquake, Holy Word, Raise Dead Fully*, Restore*) by replacing the premature-stop TSV reflow in `build_becmi_spell_staging_companion.sh` with column-isolated bbox crops for pages 13–14.

**Root cause (confirmed Story 7a):** The current extraction call `render_tsv_cols_pages_anchored_until "$pdf" 13 14 '185,370' 'FIFTH LEVEL CLERIC SPELLS' 'Druid'` stops when the word "Druid" appears anywhere in the TSV-reflowed output. TSV reflow merges all three columns by sort order, so when the right column (col 3, x > 370) of PDF page 13 encounters the "Druid" class section heading, the stop condition fires — while the left and middle columns still contain Cleric 6th descriptions (Create Normal Animals conclusion, Cureall) and all four Cleric 7th descriptions. The companion_full.txt raw extraction confirms these bodies exist in the source PDF at rawlines ~L818–L900.

**Fix approach:** Replace the TSV reflow section in `companion_spell_block_named` that handles pages 13–14 with per-column bbox crops using `companion_crop_layout`. Extract columns 1 and 2 (x=0→185, x=185→370) independently of column 3, anchoring to the Sixth Level / Seventh Level headings and stopping before Druid content. This mirrors the existing pattern used for pages 22–24 (MU 5th–7th) in the same function.

**Builder function inventory:** `companion_crop_layout page x y w h`, `render_tsv_cols_pages_anchored_until`, `render_tsv_col_pages_anchored_until` — all available in the current builder or base library.

| Sub-task | Tasked Spirit | Status | Notes |
| --- | --- | --- | --- |
| 9a. Calibrate page 13 column boundaries: run `pdftotext -tsv -f 13 -l 14` on the Companion PDF and inspect x-coordinates for the col 1/2/3 boundaries; note y-ranges for Cleric 6th heading through end-of-page | `ColCal(Calibrator)` | ✓ | Root cause was simpler than described: pages 13-14 only, page 15 had all missing content. Col boundaries x≈185/370 confirmed identical to existing builder values. |
| 9b. Verify raw content: confirm `companion_full.txt` lines ~L818–L900 contain Create Normal Animals conclusion, Cureall, Seventh Level Cleric Spells heading, Earthquake, Holy Word, Raise Dead Fully*, Restore* in correct reading order; note any OCR artifacts | `RawVerify(Inspector)` | ✓ | All content confirmed on PDF page 15. Root cause: page range stop at 14, not col 3 premature stop as originally described. |
| 9c. Write column-isolated bbox crops for pages 13–14 in `companion_spell_block_named`: replace (or augment) the failing `render_tsv_cols_pages_anchored_until` call with `companion_crop_layout` calls targeting col 1 and col 2 of pages 13–14, anchored to Sixth Level or Seventh Level cleric headings and stopped before Druid content | `BboxPatch(Builder)` | ✓ | Fix was single-number change: `13 14` → `13 15` in `render_tsv_cols_pages_anchored_until`. No col-isolation needed — page 15 has no Druid content before the stop anchor. |
| 9d. Rebuild Companion staging and validate: run `build_becmi_spell_staging_companion.sh` and confirm Cureall, Earthquake, Holy Word, Raise Dead Fully*, Restore* all appear as description bodies (Range/Duration/Effect headers present) in the output; confirm Create Normal Animals body is no longer truncated | `CompRebuild(Verifier)` | ✓ | All 5 targets confirmed present at staging lines 159, 178, 197, 217, 259 with Range/Duration/Effect headers. Builder exit 0, no assertions failed. |
| 9e. Update companion builder list-only provenance markers: the existing manual blocks for Cl7 (lines ~549–558 in builder) mark Earthquake, Holy Word, Raise Dead Fully*, Restore* as "list-only; desc → RC"; once bodies are confirmed staged, remove or replace these manual blocks with correct provenance notes | `ProvenanceCorr(Patcher)` | ✓ | Builder list-only section already had only 10 entries (pre-corrected). Validation note in builder heredoc updated to reflect Cl7 now fully described. |

---

### Story 10 — Companion Extraction Gap: Druid 5th through 7th Recovery ✓ DONE

**Goal:** Recover the 9 missing Druid description bodies (Anti-Plant Shell, Control Winds, Pass Plant, Anti-Animal Shell, Transport Through Plants, Summon Weather, Creeping Doom, Metal to Wood, Weather Control ref) from the Companion Druid section by fixing the premature-stop TSV reflow for pages 15–17.

**Root cause (confirmed Story 7a):** The current extraction call `render_tsv_cols_pages_anchored_until "$pdf" 15 17 '185,370' 'Druid' 'Fighter'` stops when 'Fighter' appears anywhere in the merged TSV output. On PDF page 16, the right column (col 3) begins the Fighter class section while the left column still contains Druid 7th descriptions (Creeping Doom, Metal to Wood, Weather Control). The stop fires from col 3's content before col 1's Druid 7th content is captured. The companion_full.txt raw extraction confirms all 9 bodies exist at rawlines ~L1050–L1128.

**Fix approach:** Replace the TSV reflow for pages 15–17 with per-column bbox crops (using `companion_crop_layout`) for pages 15–16, extracting only columns 1 and 2 to avoid the col 3 Fighter stop. Alternatively, use `render_tsv_col_pages_anchored_until` single-column extracts (cols 1 and 2 individually) with a page boundary at 16 end. Page 17 contains only Fighter/Thief/Paladin material and does not need to be included.

**Builder function inventory:** `companion_crop_layout page x y w h`, `render_tsv_col_pages_anchored_until pdf start end bounds col anchor stop_anchor` — both available. The single-column variant is preferable if column interleave across pages 15–16 can be handled cleanly by the (page, col, top) sort.

| Sub-task | Tasked Spirit | Status | Notes |
| --- | --- | --- | --- |
| 10a. Calibrate pages 15–16 column layout: run `pdftotext -tsv -f 15 -l 16` and inspect x-coordinates; determine whether Druid 5th–7th content occupies all three columns or primarily cols 1–2, and where exactly the Fighter heading begins in col 3 of page 16 | `DruidCal(Calibrator)` | ✓ | Root cause was page range only. Druid 5th-7th all on PDF page 18. Fighter starts PDF page 19. Stop anchor 'Fighter' was always correct. |
| 10b. Verify raw content order: confirm `companion_full.txt` lines ~L1050–L1128 contain Anti-Plant Shell through Weather Control in correct reading order; note whether Sixth Level Druid and Seventh Level Druid headings are present as clean anchors | `DruidRaw(Inspector)` | ✓ | All Druid 5th-7th content confirmed on page 18 cols 1-3. Seventh Level heading and stop 'Fighter' on page 19 col 1. |
| 10c. Write column-isolated extraction for pages 15–16 in `companion_spell_block_named`: replace failing `render_tsv_cols_pages_anchored_until` with `companion_crop_layout` bbox calls for col 1 and col 2 of pages 15–16, or `render_tsv_col_pages_anchored_until` for each column individually; stop before the Fighter class section begins in col 3 | `DruidPatch(Builder)` | ✓ | Fix was single-number change: `15 17` → `15 18`. No col-isolation needed — 'Fighter' stop anchor correctly fires at page 19 col 1. |
| 10d. Rebuild and validate: run `build_becmi_spell_staging_companion.sh` and confirm all 9 Druid spell descriptions appear — at minimum: Anti-Plant Shell, Control Winds, Pass Plant, Anti-Animal Shell, Transport Through Plants, Summon Weather, Creeping Doom, Metal to Wood; Weather Control may appear as a cross-reference stub ("see page 21") | `DruidRebuild(Verifier)` | ✓ | All targets confirmed at staging lines 598, 613, 654, 668, 687, 703, 731 with Range/Duration/Effect headers. Builder exit 0. |
| 10e. Update companion builder list-only provenance markers: the existing manual blocks for D5–D7 (builder lines ~561–582) mark all 9 Druid spells as "list-only; desc → RC"; once bodies are confirmed staged, remove or update these markers to reflect "desc present in Companion at pages 15–18" | `DruidProvenance(Patcher)` | ✓ | Builder list-only section pre-corrected (10 entries only). Validation note updated to reflect D5-D7 now fully described in main extraction. |

---

### Story 11 — Companion Gap Closure: Post-Recovery Validation and Pipeline Re-verification ✓ DONE

**Goal:** After Stories 9 and 10 close the Companion extraction gaps, update staging annotations, run the full pipeline rebuild, re-verify 196/196, and confirm that the Companion lane now contributes description-body witnesses for Cleric 7th and Druid 5th–7th.

**Background:** Stories 9 and 10 will add 13+ description bodies to the Companion staging lane. This changes the coverage profile for Story 8's coverage map (several previously "description-gap or RC-only" rows now gain a Companion primary). The `multi-witness builder` must be rebuilt to pick up the new witnesses, and the crosswalk confidence column should be updated for affected rows.

| Sub-task | Tasked Spirit | Status | Notes |
| --- | --- | --- | --- |
| 11a. Update Companion staging boundary annotations: revise the provenance notes added in Story 7d for Cleric 7th (annotation at staging ~L53) and Druid 5th–7th (annotation at staging ~L156) to reflect "extraction gap CLOSED by Story 9/10; descriptions now present in Companion lane" | `AnnotSync(Patcher)` | ✓ | Boundary labels updated in builder (13–15, 15–18); staging file rebuilt; list-only placeholders replaced by description bodies. Weapon talent section restored as a builder heredoc function after it was clobbered by the rebuild. |
| 11b. Rebuild multi-lane pipeline: run `build_becmi_spell_staging_multi.py write` → `import_ch06_osr.py write`; confirm `crosswalk statuses: {'yes': 196}` and `drift: no` | `PipelineRun(Builder)` | ✓ | `multi.py write`: drift: no. `import_ch06_osr.py write`: `crosswalk statuses: {'yes': 196}`, drift: yes (expected — import reflects new Companion witnesses; all removals were stale list-only placeholders). |
| 11c. Re-run survey script coverage pass: run `survey_spell_completeness.py --book companion --min-class description` (or equivalent `--coverage` mode if Story 8 has run); confirm Earthquake, Holy Word, Raise Dead Fully*, Restore*, Cureall, Create Normal Animals, Anti-Plant Shell through Weather Control all register presence in the Companion lane | `CoverageRecheck(Verifier)` | ✓ | --coverage mode (Story 8 2026-04-03): all Story 9/10 targets confirmed ✓ desc in Companion lane; full-multi-lane list includes Earthquake, Holy Word, Raise Dead Fully*, Restore*, Anti-Animal Shell, Creeping Doom, Metal to Wood, Pass Plant, Summon Weather, Transport Through Plants, Weather Control |
| 11d. Update crosswalk confidence for affected rows: re-rate Companion lane confidence from ~18 to ~19 for the 13+ newly recovered description bodies; note any rows where Companion is now the *only* confirmed primary (i.e., RC had a gap or lower confidence) | `ConfidenceUpdate(Lorekeeper)` | ☐ | Coverage matrix shows no rows where Companion is only confirmed primary (RC has ✓ desc for all 196); confidence re-rating is low priority — deferred to 8e operator review |

---

### Story 6 — Gap Remediation and Pipeline Re-verification ✓ DONE

**Goal:** For all confirmed `new-rule-gap` hits from Stories 3–5, update staging files, rebuild the pipeline, confirm 196/196 with new witness text correctly loaded.

**Result:** 2 net new staging items from Stories 3–4 (Basic Charm Person DM procedure; Companion Weapon Talent 5-talent block). Terms scan (Story 5 extension) found 0 additional new-rule-gaps. Pipeline rebuilt and verified clean.

| Sub-task | Tasked Spirit | Status | Notes |
| --- | --- | --- | --- |
| 6a. Consolidate all `new-rule-gap` hits into ranked remediation backlog | `GapMap(Assessor)` | ✓ | 2 items: Basic Charm Person DM procedure (L5516–5545); Companion Weapon Talent 5-talent block (L6628–6653). Both already staged during Stories 3–4. |
| 6b. Update staging lane files: add confirmed gap text as sub-blocks | `StagePatch(Patcher)` | ✓ | Applied during Stories 3–4 with operator approval. Verbatim-only discipline enforced. |
| 6c. Update crosswalk anchors for any new staging sub-sections | `AnchorSync(Lorekeeper)` | ✓ | No new crosswalk anchor rows required; both items attache to existing spell rows in their lanes. |
| 6d. Rebuild pipeline: `build_becmi_spell_staging_multi.py write` → `import_ch06_osr.py write` → verify 196/196, drift: no | `PipelineVerify(Verifier)` | ✓ | `drift: no`; `crosswalk statuses: {'yes': 196}` |
| 6e. Re-run `audit_crosswalk_source_completeness.py`; confirm 0 candidates | `AuditFinal(Auditor)` | ✓ | Total candidates: 0. Epic closed. |

---

## Cross-Cutting Concerns

### What counts as "relevant"

A hit is a **capture candidate** if it:
- Adds a save modifier, duration table, caster-level scaling rule, or interaction mechanic not in the primary description
- Describes a monster's or item's behavior that modifies how the spell functions when cast
- Provides a procedure rule governing how the spell interacts with another rule system (anti-magic, dispel, overcharge, etc.)

A hit is **incidental** if it:
- Lists the spell name in a lookup table with no additional text
- Says only "can be dispelled by Dispel Magic" / "immune to Sleep" without adding new mechanics
- Appears purely in flavor description of an adventure site or NPC

### Alias and fuzzy-match precedents

- `Fire Ball` and `Fireball` — match both; one crosswalk row
- `Finger of Death` — reverse of Raise Dead; hits classify against Raise Dead staging row
- `Darkness` and `Continual Darkness` — reverse synthetics; new-rule hits attach to Light / Continual Light row respectively, or create a reverse note
- `Charm Person` vs. `Charm Monster` — must disambiguate; context window handles most cases

### Session pacing

- Stories 1 + 2: one focused implementation session (infrastructure + script)
- Stories 3–5: one triage session per book-pair, 1–2 hours each
- Story 6: runs in batches after each triage session, or as a final cleanup pass

---

## Extraction Files Registry

| Book | PDF | Extraction Path | Line Count | Status |
| --- | --- | --- | --- | --- |
| Basic | `_becmi/TSR 1011B - Set 1 Basic Rules.pdf` | `_becmi/extractions/basic_full.txt` | 8,314 | ✓ verified 2026-04-03 |
| Expert | `_becmi/TSR 1012B - Set 2 Expert Rules.pdf` | `_becmi/extractions/expert_full.txt` | 6,202 | ✓ verified 2026-04-03 |
| Companion | `_becmi/TSR 1013 - Set 3 Companion Set.pdf` | `_becmi/extractions/companion_full.txt` | 7,132 | ✓ verified 2026-04-03 |
| Master | `_becmi/TSR 1021 - Set 4 Master Rules.pdf` | `_becmi/extractions/master_full.txt` | 7,813 | ✓ verified 2026-04-03 |
| Immortals | `_becmi/TSR 1017 - Set 5 Immortals Rules.pdf` | `_becmi/extractions/immortals_full.txt` | 7,384 | ✓ verified 2026-04-03 |
| RC | `_becmi/TSR 1071 - The D&D Rules Cyclopedia.pdf` | `_becmi/extractions/rc_full.txt` | 20,841 | ✓ verified 2026-04-03 |

---

## Hit Report

Active hit report: `_todo/BECMI/TODO_Completeness_Survey_Hits.md` (created by `survey_spell_completeness.py --write`)

---

## Remediation Backlog

*(Populated during Story 6a — closed 2026-04-03)*

### Net staged items (approved)
1. **Basic — Charm Person DM Procedure** (`TODO_BECMI_Spell_Material_Staging_Basic.md`): Intelligence-based save-frequency table (High=1 day / Average=1 week / Low=1 month) + shapechange auto-break. Source: `basic_full.txt` L5516–5545.
2. **Companion — Weapon Talent 5-talent block** (`TODO_BECMI_Spell_Material_Staging_Companion.md`): Verbatim OCR, `companion_full.txt` L6628–6653. Talents: Breathing (Water Breathing / Air Breathing 1/day), Charming (charm person 1/day 120'), Finding (locate object 1/day 120'), Slowing (reverse Haste 1 turn, **no Save**), Speeding (haste 1 turn on user).

### Deferred / out of scope
- **RC Dispel Magic / Enchanted Vessel procedure** (`rc_full.txt` L18814–18833): backlisted to `_todo/ftls/TODO_Magitech_Fantascience_Chapter05.md` (B1). Belongs to future Magic Items/Artifacts full-text Epic.

### Terms scan results (2026-04-03)
- Ran `--terms 'anti-magic,magical nature,enchanted,dweomer,permanent magic,temporary magic,spell effect,magical effect,metaphysical,astral,ethereal,Power Points,mana'` across all 6 books; 288 hits total at `rules-note` minimum.
- **0 new-rule-gaps found** for the spell completeness survey. All hits classified as: already staged, cross-book-dupe, creature-stat-block incidental, or future-Epic scope.
- RC Planes chapters (L19400+) and vessel enchantment content (Ch.16) identified as primary targets for the planned future metaphysics/world-ontology terms Epic.
