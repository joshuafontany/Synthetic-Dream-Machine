# Vancian vs SDM Mechanics Research

## Confirmed Differences (Canon from local docs)

### Access Model
- **Vancian**: Daily preparation; classes gate spells available and grant abstract "Spell slots" with "spell level" ratings, spells must be memorized/selected each day in these specific level-based slots
- **SDM**: No class gating (in-world/story gating), no preparation; powers held as trait/item/burden slots, accessible on-demand

[Canon: Synthetic_Dream_Machine_01_Quickstart.md -> "Powers and Spells"]
[Canon: Vastlands_Guidebook.md -> "Using Powers"]

### Cost Model
- **Vancian**: Spell slot consumption (expended 1x per use per day)
- **SDM**: Life/mana cost (P:X = X life per use, usable repeatedly from same source), Life from the caster is the primary method, mana from stored sources can be an option, as well as Life from friends, "stolen" Life pools, etc

[Canon: Synthetic_Dream_Machine_01_Quickstart.md -> "Powers and Spells"]
[Canon: Vastlands_Guidebook.md -> "Activating Powers"]

### Storage Model
- **Vancian**: Spellbook (written spells) + memory (prepared spells) + ritual targets (some cleric spells)
- **SDM**: Trait slots (Ba "Psyche", and Ka "Soul" slots), Item slots (Ha "Body" physical/device-based), Burden slots (Trait/Gear overflow, afflictions/curses), Structure/Location (installed in gear/vehicles/infrastructure/etc)

[Canon: Synthetic_Dream_Machine_04_Powers_Index.md -> "Usage Notes"; seat contracts: bags/@sdm mount-points]
[Canon: Vastlands_Guidebook.md -> "Storing Powers"]

### Learning Model
- **Vancian**: Wizards have "spells known" limit (typically tied to level); can copy new spells to spellbook, other classes had other gates
- **SDM**: Any character can use any power if they have access to it (no learning gate), but skills/traits reduce danger. Path traits (skills) grant proficienty in MAgitech, Fantascience, Both, or Other Specialties (we use the tag system)

[Canon: Vastlands_Guidebook.md -> "Skills and Powers"]

### Inventory Semantics
- **Vancian**: Orthogonal systems (spell slots separate from inventory; spell levels 1–9 fixed by class)
- **SDM**: **Unified inventory model**: 7 + STR item slots, 7 + Thought score trait slots for character concepts, 20 burden slots; powers occupy trait OR item slot (not separate, may even be a Burden if cursed, etc) + burden/structure/location seat variants. Vehicles and other "entities" can also have Powers. Some rare Powers take up more than one slot.

[Canon: Synthetic_Dream_Machine_01_Quickstart.md -> "Item and Trait Overflow"]

## Likely-but-Inferred Differences

### Power Complexity Scaling
- **Vancian**: Spell level (1–9) gates access; higher levels require higher caster level
- **SDM**: Power Level (P: 1–21+) gates cost in life/mana; no level gate; higher Power Level = higher Life cost, but any character can attempt use
  - **Dangerous MAgic**: "Wild Magic" Danger rolls replace character level gates — higher-level powers invite corruption risk rather than access gate

### Specialization vs. Generalization
- **Vancian**: Class + spell selection (wizard vs. cleric vs. druid narrow options)
- **SDM**: Any character can adopt any power via trait/item, including hybrid (e.g., soldier using oldtech healing power). Some Paths only give "skill" in Magitech or Fantascience (and some are upgradeable, or grant other proficiencies.)
  - **Inference**: SDM encourages cross-tradition mixing; "albums of power" formalize bundle-selling but don’t gate access, which must be worked out "in-game"

### Attunement & Corruption
- **Vancian**: Spell save DCs scale with caster level; no mechanical "taint"
- **SDM**: [dangerous] tag + corruption trait acquisition; hazard of power use shifts burden to character thematic alignment
  - **Inference**: Using powers is not game-natural in SDM the way it is in Vancian; there’s always an existential cost

## File Anchors for Citation

### Core Mechanics
- [Synthetic_Dream_Machine_01_Quickstart.md#L466](Synthetic_Dream_Machine_01_Quickstart.md#L466) → "Powers and Spells" paragraph
- [Synthetic_Dream_Machine_01_Quickstart.md#L750](Synthetic_Dream_Machine_01_Quickstart.md#L750) → "Item and Trait Overflow"
- [Vastlands_Guidebook.md -> "Using Powers"](#page_0096) (approx line 3930)
- [Vastlands_Guidebook.md -> "To Be A Proper Wizard"](#page_0105) (approx line 4398)
- [Vastlands_Guidebook.md -> "Storing Powers"](#page_0096) (within Using Powers section)
- [Flying_Triremes_and_Laser_Swords_06_Powers_and_ECM.md -> "Powers from Old School Roleplaying"](ftls/Flying_Triremes_and_Laser_Swords_06_Powers_and_ECM.md) → canonical `Spell Level × 2 = SDM Power Level` pin (Luka Rejec)

### Storage & Access
- `bags/@sdm/ha.ka.ba/sdm/mount-points/{trait,item,burden,structure}` → seat contracts (trait 7+Thought · item 7+Strength · burden 20/−1)
- [Synthetic_Dream_Machine_03_Traits_Index.md#L4388](Synthetic_Dream_Machine_03_Traits_Index.md#L4388) → "Power Scroller" trait (shows scroll-binding mechanic)
- [Synthetic_Dream_Machine_01_Quickstart.md#L468](Synthetic_Dream_Machine_01_Quickstart.md#L468) → "Each power or spell occupies a trait or item inventory slot..."

### Power as Trait
- [Synthetic_Dream_Machine_03_Traits_Index.md#L4388](Synthetic_Dream_Machine_03_Traits_Index.md#L4388) → "Powers as Traits" section anchor

## Storage Semantics Summary

| Aspect | Vancian | SDM |
|--------|---------|-----|
| **Primary container** | Spellbook (1 per wizard) | Inventory: trait/item/burden slots; rare Powers take up more than one slot |
| **Daily limit** | Spell slots by level (1–9) | No daily limit; repeated uses cost Life/Mana each time |
| **Preparation time** | 1 hour per spell level (study) | Instant (held in slot), time gate for "installing/uninstalling", or shifting Powers from active inventory to "cold storage" devices |
| **Access gate** | Class + spell level + known spells | Trait/item possession + Life/Mana cost |
| **Permanent loss** | Losing spellbook = spell loss | 0 Level items: Marking trait/item indicates "damage", marking again = instantaneous loss, no recovery; Higher LEvel items may allow other patterns, including Life scores, Ability scores, etc |
| **Overflow handling** | Not in core rules | Burden slots; -1 per burden |

## Crosswalk Module Implications

### Spell-to-Power Module Mapping

**Doctrine (Canon + Working Protocol)**: A proper BECMI→SDM spell crosswalk must account for:

1. **Power Level (P)** = `max(1, BECMI Spell Level × 2)` — canonical formula pinned by Luka Rejec.

   > *"As a general conversion guideline, SDM Power Level = OSR ’Spell Level’ x2."*

   [Canon: Flying_Triremes_and_Laser_Swords_06_Powers_and_ECM.md -> "Powers from Old School Roleplaying"]
   Corroborated: `TODO_BECMI_Conversion.md`, `TODO_Magitech_Fantascience_Chapter05.md`, `TODO_Lares_Chapter05_Agent_Prompt.md`

   Full BECMI → SDM P: conversion table:

   | BECMI Spell Level | SDM P: | Notes |
   |---|---|---|
   | Cantrips / free effects | P: 1 | floor — `max(1, 0×2)` |
   | 1st | P: 2 | |
   | 2nd | P: 4 | |
   | 3rd | P: 6 | *calibration anchor: Pyreball in SDM Powers Index = P: 6* |
   | 4th | P: 8 | |
   | 5th | P: 10 | |
   | 6th | P: 12 | *[dangerous] threshold begins here* |
   | 7th | P: 14 | *Clerical max in BECMI* |
   | 8th | P: 16 | |
   | 9th | P: 18 | *MU max in BECMI* |

   Variable / multi-level spells map as variable P: entries or use Overcharge steps rather than a fixed level. Before assigning a final P:, cross-check analogous powers in the SDM Powers Index for calibration trends (e.g., `Real-Time Rebuild` P: variable, `Reuse the Shell` P: 1–12). This is the **Trend Reference step**: the locked staging corpus provides the source witness; the SDM Powers Index provides the calibration pattern.

2. **Storage seat** determines accessibility. Seat contracts live in `bags/@sdm/ha.ka.ba/sdm/mount-points/`; the ms card carries no storage tag — a card notes its seating in prose or `meta:` where it matters:
   - **trait seat** = mastered power, signature ability (like a special ability)
   - **item seat** = spellbook/device/scroll (findable, stealable)
   - **burden seat** = curse powers, geas-like bindings

3. **[dangerous] tag** replaces "high spell level resistance" on NPCs
   - The P: 12 threshold is not arbitrary: under the x2 formula, 6th-level is where the BECMI spell list turns world-altering — *Geas*, *Death Spell*, *Disintegrate*, *Move Earth*. These aren’t utility spells; they reshape narrative, bypass defenses, or kill outright. SDM powers in the existing index also cluster [dangerous] at P: 12+, so the formula and the observed design trend agree.
   - **Default rule**: spells of 6th level and above (P: 12+) receive the [dangerous] tag automatically during conversion.
   - **Per-card editorial rule**: spells below 6th level may still receive [dangerous] if the effect is permanently identity-altering, death-adjacent, or corrupting in context (e.g., a 4th-level domination variant with permanent personality overwrite). This is a case-by-case call, not automatic.
   - Failure to activate safely → corruption trait acquisition, not spell fizzle. The [dangerous] tag shifts the hazard from "wasted slot" to existential cost.

4. **"To Be A Proper Wizard" ritual** is the SDM equivalent of "multiclass wizard"
   - No daily spell slot pressure, but accept permanent character costs
   - Encourages custom power albums instead of class-bound spell lists

5. **Trend Reference Workflow** — apply before finalizing any P: assignment:
   - Source witness: consult the locked staging corpus (`_todo/BECMI/TODO_BECMI_Spell_Material_Staging.md` + lane files) for the spell’s mechanics.
   - Calibration check: cross-reference the SDM Powers Index for analogous powers.
   - Primary anchor: `Pyreball` (SDM Powers Index) = P: 6, confirming 3rd-level Fireball at `3 × 2 = 6`.
   - The staged corpus is frozen; no new ad hoc scraping against PDFs during conversion work.

### Phase 2 Promotion Priority

For crosswalk Phase 2 module sections, prioritize rows with:
- High Power Level (P: 12–18+) for iconic spells known by name (6th–9th level under x2 formula)
- Multiple seat variants (item-locked spells should list trait-equivalent)
- [dangerous] tag + corruption domain for spell-from-tome powers (P: 12+ = 6th-level and above)
- Album association where available (e.g., "Eternal Arkhiatricon" album for undead-themed Vancian spells)

### OSR Magic Patterns Reference

Data-mined from SDM Powers Index, FTLS_06_Powers.md, UVG2e, VLG, and OGA. These are confirmed conversion choices, not inferences — each has at least one SDM power card as evidence. Use these as the default approach when converting any BECMI spell; deviate only with an explicit note.

#### A. Damage and Dice

- **Damage dice preserved verbatim.** `1d6 per caster level` → `1d6 per user Level`. No re-mapping or substitution. Dice expressions in the source become dice expressions in the card. Add a hard cap (max 20d6) for scaling spells where runaway values are plausible (Fireball, Lightning Bolt pattern).
- **Save penalties preserved.** OSR mechanics like "Save vs. Spells at -2 for single-target Hold Person" carry over converted to SDM terms/units; write the penalty explicitly in the card body as a conditional modifier on the Endurance or Aura save line.
- **No-save thresholds preserved.** Sleep-style "no save if HD below threshold" maps to "no save if Level below threshold." State the threshold explicitly in the card.

#### B. Saving Throws

**SDM save mechanics (canon):**

- **Standard save:** `d20 + Endurance or Aura ability score` vs. target 13. Under = doom; exactly 13 = sacrifice (save at a cost); over = saved. [Canon: Synthetic_Dream_Machine_01_Quickstart.md -> "Saving Rolls"]
- **Endurance save:** `d20 + Endurance` — physical resilience, disease, injury, poison, harsh conditions.
- **Aura save:** `d20 + Aura` — psychic/spiritual integrity, mental effects, magical coercion, daemonic influence, possession.
- **Defeat Roll:** `2d6 + Endurance` (physical) or `2d6 + Aura` (mental) — NOT a save, but related. Triggered *after* Life drops to 0 or an ability score is reduced to 0. Determines the severity of the consequence (stunned / scarred / dead / destroyed etc.). High-P dangerous powers that land may require a Defeat Roll on top of normal damage.
- **Morale Roll:** `2d6` (no modifier), NPC-only. Reference for `Fear` and related effects for power conversion.
- **Active ability scores (Strength, Agility, Charisma, Thought) are NOT used for saves.** If the character is aware enough to react consciously, it is no longer a save situation — it is an action or defense. Only Endurance and Aura feed into saving rolls.

OSR save categories map to SDM as follows:

| OSR Save Category | SDM Save | Dice | Notes |
|---|---|---|---|
| Save vs. Spells | Aura save | d20 + Aura | Charm, hold, confusion, mental domination, magical area effects |
| Save vs. Paralysis | Aura save | d20 + Aura | Hold Person/Monster, Stasis, stun effects |
| Save vs. Death Ray | Endurance save | d20 + Endurance | Targeted lethal effects; may also trigger Defeat Roll on failure |
| Save vs. Breath Weapon | Endurance save | d20 + Endurance | Physical area blast caught in; fire, cold, acid, gas |
| Save vs. Poison | Endurance save | d20 + Endurance | Poison, venom, toxic cloud effects |
| Save vs. Wands | Aura save | d20 + Aura | Magical device discharges, force effects |
| Save vs. Petrification / Polymorph | Endurance save | d20 + Endurance | Body-altering physical transformations |
| No save (automatic) | No save | — | Magic Missile, Sleep threshold victims, etc. |
| Save or die | Endurance or Aura save + Defeat Roll on failure | d20, then 2d6 | High-P effects (P: 12+); failure triggers a Defeat Roll, not just damage |

Save outcome language (half damage, negate, -2 penalty, save or die) is preserved directly from the OSR source — do not flatten or randomize it. Write the modifier and outcome explicitly in the card body. For spells with "save or die" character, add a note that failure triggers a Defeat Roll, and ensure the `[dangerous]` tag is present if base P: 12+.

#### C. Duration and Activity

**SDM Duration Vocabulary (canonical)**

SDM power cards do not use a fixed time-unit system. Duration fields (`D:`) freely mix qualitative and quantitative language. Native SDM duration atoms from the Powers Index:

| Type | Examples |
|---|---|
| Instantaneous | `instant`, `0`, `interrupt` |
| Combat round | `one round`, `X rounds` |
| Minute-scale | `1 minute`, `5 minutes`, `10 minutes`, `a few minutes`, `several minutes`, `a minute or so` |
| Hour-scale | `1 hour`, `an hour`, `6 hours`, `several hours`, `an hour and an hour` |
| Day-scale | `a day`, `1 day`, `1 day and 1 night` |
| Open-ended / committed | `permanent`, `imbued`, `special`, `until dispelled` |
| Narrative | `1 dream`, `gestation period`, `until reality forcefully intervenes (then save)` |

SDM rounds are explicitly **cinematic, not precise** — "long enough to do something meaningful" (Quickstart → Rounds). Hours and days map to real-world time periods but carry no rigid watch or shift subdivisions.

**OSR → SDM Duration Conversion**

OD&D and BECMI use three primary time units in spell text. Their SDM equivalents:

| BECMI/OD&D Unit | Real-Time Meaning | SDM `D:` Preferred Form | Notes |
|---|---|---|---|
| Instantaneous | Immediate, no lingering | `instant` or `0` | Both forms valid; prefer `instant` |
| 1 round | One combat action (~6 sec) | `one round` | Preserved 1:1 |
| X rounds | Short combat duration | `X rounds` | Preserved 1:1 |
| 1 turn | 10-minute exploration increment | `10 minutes` | BECMI "turn" = 10-min delve; write out plainly |
| X turns | X × 10 min | `X × 10 minutes` | Prefer written-out form; 6 turns may collapse to `an hour` |
| 1 turn per Level | 10 min × user Level | `10 minutes per user Level` | Per-level scalar stays in base card body, not Overcharge |
| X rounds per Level | — | `X rounds per user Level` | Per-level stays in base card |
| 1 hour | 60 minutes | `an hour` or `1 hour` | Both in active use; prefer natural language |
| X hours | — | `X hours` or `several hours` | Write out specific count when known |
| 1 day | 24 hours | `a day` or `1 day` | Both forms valid |
| Until dispelled / concentration | — | `[focus]` + duration phrase, or `[imbued]` | See focus/imbued distinction below |
| Permanent | None | `permanent` | |

**Currency note on "minutes"**: OD&D source text sometimes writes "minutes" meaning literal per-minute real time, not exploration turns. Write these as `X minutes` in the `D:` field.

**[focus] vs. [imbued] distinction:**

- `[focus]` = concentration required; Life cost is spent at activation and not locked; breaks on disruption (Wall of Fire pattern).
- `[imbued]` = no concentration needed; Life cost remains locked (unavailable for other use) until the effect is dropped (Protection from Evil, Invisibility, Shield Ward pattern).
- Spells that require sustained attention without explicit concentration language default to `[imbued]` if they have a significant duration and a clear deactivation trigger.

**Zone / Range Doctrine**

SDM uses an **abstract zone system** rather than foot-based ranges. Canonical tiers from the Quickstart (Movement and Range table):

| Zone | Approximate Distance | Combat Notes |
|---|---|---|
| `self` | Caster only | Personal effect |
| `touch` | ~1m / arm’s reach | Requires physical contact |
| `here` | ~3m / 10ft | Adjacent, body-length |
| `short` / `nearby` | ~5–20m / 15–60ft | 1 round to close from medium |
| `medium` | ~30–50m / 100–150ft | 2 rounds to close |
| `far` | ~45–75m / 150–240ft | 3 rounds to close |
| `an arena` | ~100m+ | Large space; not normal combat scale |
| `off-stage` | Sight line or beyond | Not reachable in combat without travel |

The Powers Index supplements these with **narrative descriptors** (`eating distance`, `scratching distance`, `whisper`, `a crowded room`, `a short walk`, `a day's march`) and **explicit metric values** (`3m`, `10m`, `30m`, `50m`). Both forms are in active use; the system privileges narrative clarity over arithmetic precision.

**BECMI → SDM Range Conversion**

Write the SDM zone label first; append the parenthetical OSR value (metric + feet) for source traceability. The FTLS template (`far (~45m / 150ft)`) is the established pattern.

| BECMI Range | Feet | Metric (~) | SDM Zone | Card `R:` Form |
|---|---|---|---|---|
| Self | — | — | `self` | `self` |
| Touch | 0 | 0 | `touch` | `touch` |
| 10–15 ft | 10–15 ft | ~3–4m | `here` | `here (~4m / 15ft)` |
| 30 ft | 30 ft | ~9m | `short` | `short (~9m / 30ft)` |
| 60 ft | 60 ft | ~18m | `short` | `short (~18m / 60ft)` |
| 90–120 ft | 90–120 ft | ~27–36m | `medium` | `medium (~30m / 100ft)` |
| 150 ft | 150 ft | ~45m | `far` | `far (~45m / 150ft)` |
| 240 ft | 240 ft | ~73m | `far` | `far (~75m / 240ft)` |
| 360 ft+ / line of sight | 360 ft+ | ~100m+ | `off-stage` | `off-stage (~100m+)` or `visible range` |

**Per-level range:** Map to a static baseline zone in the base card; encode Overcharge extension to the next zone tier. Do not scale the base `R:` linearly with level. (Pattern: Detect Invisible → static `short (~18m / 60ft)`, with Overcharge step providing `medium` extension.)

#### D. Overcharge Doctrine

- **Overcharge = secondary effects, not more dice.** No examined SDM power uses Overcharge to increase raw damage. Overcharge steps encode: larger radius or area, additional targets, extended duration, dual-mode variants, enhanced penetration, or narrative escalation.
- **Dual-mode spells use a single card with a choose-at-cast option.** OSR spells with two strongly distinct expressions (Ice Storm: damage burst vs. Ice Wall: barrier) become one card with "choose one of two expressions at cast time" in the body, not two cards or an Overcharge step.

#### E. Reversible Spells

- **General rule: Reversed forms are NOT separate SDM power cards.** The reversed form (Cause Light Wounds, Free Person, etc.) is preserved verbatim in the `osr:` block as canonical reference, but does not become its own entry in the Powers Index.
- **Per-card judgment:** If the reversed form has strong narrative utility in the SDM context, it is encoded as a `Reversable:` line in the main Power block — **not** as an Overcharge step, and **not** as a separate card. The `Reversable:` line names the inverted form, states its target and effect, and carries any additional tags or riders the hostile use warrants. P: cost does not change. This is case-by-case and must be marked with an editorial note. The default is: reverse lives in `osr:` only. Pattern:
  > *Cure Light Wounds* — `Reversable: Cause Light Wounds. Touch one unwilling creature; deal 1d6+1 damage instead of healing. Add [dangerous] rider for hostile use.`
  
  Related reversals that fit this pattern: Cure/Cause Critical Wounds, Restore/Cause Serious Wounds. Raise Dead / Finger of Death is a separate pair at escalating P: and gets separate cards rather than a `Reversable:` line, because the P: gap is too large to share a block. In actual play, reversed forms may start as encrypted/damaged/locked sections of the Power.
- **Counter-push-pull exception: Light ↔ Darkness and analogous opposing loops.** Some reversible pairs are not merely thematic inverses — they are designed to contest each other as **active game states**. The canonical SDM instance is Light ↔ Darkness:
  - FTLS directly rules the opposition: *"Darkness will cancel a light spell if cast upon it, but may itself be cancelled by another light spell."* Continual Light cancels Continual Darkness and vice versa. [Canon: ftls/Flying_Triremes_and_Laser_Swords_06_Powers_and_ECM.md → Continual Light / Darkness entries]
  - This makes Darkness a **tactical** counterplay tool with direct exploration and combat utility, not merely the narrative opposite of Light.

  **Editorial rule:** When the reversed form functions as a **direct mechanical counter** to the base spell (or to a named category of ongoing effects), it earns its own separate card — not `Reversalbe:` storage, and not `osr:` block only. The card body must name the opposition relationship explicitly.

  This counter-push-pull structure recurs across several SDM game-loops:

  | Loop | Initiating side | Counter side | Sources |
  |---|---|---|---|
  | Light / Darkness | Light, Continual Light | Darkness, Continual Darkness | FTLS_06 → Light, Continual Light |
  | Scry / Obfuscate | Clairvoyance, Wizard Eye, Detect spells | ECM rituals, anti-scrying wards, Lair Magic ward-testing resistance | FTLS_04 → ECM; FTLS_05 → Amulet of Proof; FTLS_02 → Lair Magic |
  | Illusion / Disbelief | Phantasmal Force, Mirror Image, illusion module | Aura test to disbelieve; area effects that ignore sight-driven targeting | FTLS_06 → Phantasmal Force; FTLS_03 → [illusion][light] affinity |

  For Light/Darkness specifically, the four-card structure is established by FTLS and should be preserved in the Chapter 06 import:
  - **Light** — P: 2, separate card; body states it is cancelled by Darkness cast upon it.
  - **Darkness** — P: 2, separate card; body states it cancels active Light in the area, and is itself cancelled by a subsequent Light or Continual Light.
  - **Continual Light** — P: 4, separate card; body states it cancels active Darkness and Continual Darkness.
  - **Continual Darkness** — P: 4, separate card; body states it resists non-continual light sources and is cancelled only by Continual Light.

#### F. Tag System and Assignment

##### F.1 — What Tags Are

Tags are not flavor labels — they are **procedure flags that tell the referee what to do at table speed** (FTLS meta-note; confirmed in all sdm/FTLS source chapters). They encode rules hooks, Affinity-triggering signals, and storage/activation semantics directly on the power card. The canonical tag vocabulary lives in [Flying_Triremes_and_Laser_Swords_10_Appendix_Null_Referee_Resources.md](ftls/Flying_Triremes_and_Laser_Swords_10_Appendix_Null_Referee_Resources.md) — consult it before inventing new tags.

##### F.2 — Structural Frame Tags (Mandatory)

Every power card — native SDM or OSR-derived — carries exactly one structural tag, first on the tag line:

| Tag | Role | Values |
|---|---|---|
| `[power]` | Universal marker; always first | Always `[power]` |

Storage seating (trait · item · burden · structure · location) rides no tag: seat contracts live in the `bags/@sdm` mount-points, and a power that can live in more than one seat says so in prose or gains variant cards. For seat definitions, cross-reference Point 2 of the Spell-to-Power Module Mapping section above.

Tradition tags (`[oldtech]`, `[fantascience]`, `[ritual]`, `[weapon]`) follow immediately after `[power]` when they apply. They are not a mandatory slot — omit them when none clearly fits. `[fantascience]` signals CHARISMA-track proficiency; `[oldtech]` signals THOUGHT-track proficiency. Their definitions live in Appendix Null (Schools & Traditions, Artifacts & Practices, and Weird Science & Magitech sections).

##### F.3 — Tradition Tags (conditional)

The tradition tags name the power’s origin context and drive Affinity and proficiency hooks. They are drawn directly from the Appendix Null tag vocabulary; their definitions live in the "Schools & Traditions," "Artifacts & Practices," and "Weird Science & Magitech" sections.

| Tag | Meaning and assignment criteria | BECMI spell examples |
|---|---|---|
| `[ritual]` | Transformation, binding, invocation, lifecycle transitions, body-alteration, summoning-register, or any effect that restructures a person, object, or relationship rather than simply projecting force. Applies to both cleric and magic-user spells. In Appendix Null: "Artifacts & Practices." | Animate Dead, Alter Self, Dispel Magic, Reincarnate, Raise Dead, Knock/Lock, Charm Person, Repel/Ward spells |
| `[fantascience]` | Unstable sorcery-tech; CHARISMA-track proficiency. Physics-defying energy discharge, artillery-register effects, or reality-override; feels like a malfunctioning weapon or overloaded device rather than a learned technique. Typically involves direct-damage area blasts or high-tier force effects. In Appendix Null: "Core" and "Weird Science & Magitech." | Fireball, Delayed Blast Fireball, Meteor Swarm, Power Word Kill, Power Word Blind |
| `[oldtech]` | Magitech; THOUGHT-track proficiency. Precise detection, analysis, access, or targeted biological/technical augmentation; feels like careful instrumentation rather than spectacle. Minimal fictional side-effects; operational, not spectacular. In Appendix Null: "Core" and "Weird Science & Magitech." | Detect Magic, Detect Evil, Clairvoyance, ESP, Infravision, Mage Armor, Locate Object, Find Traps |
| `[weapon]` | Weapon-mode power; delivers its effect through a weapon frame or resolves as a weapon attack. No BECMI spell examples yet — tag is available in Appendix Null: "Artifacts & Practices" for Chapter 05 Magitech work. | *(none yet — re-examine when Chapter 05 commences)* |

If none of the tradition tags apply, omit them. The mandatory `[power]` frame still applies. Layer 3 behavior tags carry the descriptive weight for catch-all powers. A power without a tradition tag is implicitly general.

##### F.4 — Additional Tags: The FTLS_06 Layered Pattern

FTLS Chapter 06 establishes the conversion pattern: extend the 2-tag structural frame with additional tag layers. All tag vocabulary must be drawn from Appendix Null unless explicitly noted. We are open to creating new tags, but they must be documented in Appendix Null when introduced. The full tag line for a converted power typically runs 5–10 tags.

**Layer 2 — Tradition/Source and OSR School Tags**

sdm/FTLS tradition tags go first within this layer — placed immediately after `[power]` — when they apply: `[oldtech]` · `[fantascience]` · `[ritual]` · `[weapon]` (full criteria in F.3). Then add OSR school and cleric domain names directly as flat tags. Do **not** remap or substitute SDM vocabulary.

*Magic-User schools:*
`[abjuration]` · `[conjuration]` · `[divination]` · `[enchantment]` · `[evocation]` · `[illusion]` · `[necromancy]` · `[transmutation]`

*Cleric domains (from Appendix Null — Clerical & Cult Domains):*
`[healing]` · `[blessing]` · `[curse]` · `[life]` · `[death]` · `[light]` · `[darkness]` · `[nature]` · `[trickery]` · `[knowledge]` · `[tempest]` · `[war]` · `[geas]` · `[sacrifice]` · `[oath]` · `[faith]` · `[prophecy]`

**Layer 3 — Mechanical Behavior Tags**

From Appendix Null — Core section. Apply all that fit; these drive table-speed referee decisions. Key tags for BECMI conversions:

`[attack]` · `[focus]` · `[imbued]` · `[ward]` · `[aura]` · `[area S/M/L]` · `[burst]` · `[dangerous]` · `[fueled]` · `[anchored]` · `[reaction]` · `[instant]` · `[line]` · `[cone]` · `[zone]` · `[guided]` · `[petrifying]` · `[fearsome]` · `[vital]` · `[necrotic]` · `[deathly]` · `[vorpal]` · `[slow]` · `[clumsy]` · `[attune]`

**Layer 4 — Element / Effect / Thematic Tags**

From Appendix Null — Elements & Energies, Dreams & Shadows, Totems & Spirits, Schools & Traditions, and Artifacts & Practices. These support Affinity triggering and faction/caster-tradition positioning.

Apply all that are genuinely present in the spell’s fiction. Don’t pad; 2–4 thematic tags is normal.

Representative examples for BECMI conversions: `[fire]` · `[lightning]` · `[cold]` · `[force]` · `[radiant]` · `[poison]` · `[light]` · `[darkness]` · `[earth]` · `[air]` · `[water]` · `[ice]` · `[illusion]` · `[phantasm]` · `[mind]` · `[death]` · `[undead]` · `[dream]` · `[chaos]` · `[void]` · `[astral]` · `[summon]` · `[banish]` · `[bind]` · `[ward]` · `[song]`

##### F.5 — `[dangerous]` vs. `[high-tier]`

`[dangerous]` is canonical — it appears in Appendix Null Core and is the doctrinal tag for powers that trigger Danger Rolls or corruption exposure (see Section 3 of the Spell-to-Power Module Mapping for P: 12+ default rule).

`[high-tier]` appears in FTLS_06 power cards but is **absent from Appendix Null** and therefore not part of the canonical tag vocabulary. It is a temporary marker. **Do not use `[high-tier]` in new BECMI conversions.** Use `[dangerous]` for powers at P: 12+ and for save-or-die / world-altering effects.

##### F.6 — Default Tag Sets for Common BECMI Families

**Seat default — trait:** All BECMI-derived power cards seat as traits by default. This follows the conversion's core move: SDM replaces Vancian spell slots with trait slots, so a learned spell rides in you as an ability, not in a text you hold. Note that FTLS_06's OSR imports lean item-seated (grimoire-pattern); that precedent serves item-side variants, not this work. When Chapter 05 (Magitech & Fantascience — magic items and artifacts) work commences, item- and burden-seat variants of many of these powers will emerge. The seat serves as the knob to turn when that happens — do not retroactively alter the base trait card, create additional item/burden-mode variant cards instead. One burden-seat precedent worth noting now: FTLS_06 uses it for powers whose primary effect IS an ongoing burden condition (Giant Growth, Crown of the Grave are examples). If a converted spell primarily imposes Wear-and-Tear, a burden seat may fit alongside the trait seat, etc. Note: *Reckless Dweomer* seats as a trait — Mana sits in a Trait slot and only *overflows* into Burdens when no Trait slot stands open; the burden state follows from overflow, not from the primary seat.

If none of the tradition tags (F.3) apply to a given family’s cards, omit the tradition tag — the table’s Layer 3 behavior tags carry the meaning.

Starting tag patterns by spell module. All are `[power]`, trait-seated, unless noted — fill in spell-specific Layer 3/4 details beyond what’s shown.

| BECMI Module | Tradition tag (if applicable) | School (L2) | Behavior (L3) | Element (L4) |
|---|---|---|---|---|
| Direct damage — blast-register (Fireball, Delayed Blast Fireball, Meteor Swarm, Death Spell) | `[fantascience]` | `[evocation]` | `[attack]` `[dangerous]` `[area M]` or `[area L]` | `[fire]` / `[force]` / element |
| Direct damage — technique-register (Lightning Bolt, Magic Missile, Cloudkill, Cone of Cold) | *(none)*; add `[fantascience]` at L4 for high-energy-feel spells (Lightning Bolt, Chain Lightning) | `[evocation]` | `[attack]` `[dangerous]` | element tag |
| Ward / Protection (Protection from Evil, Shield, Anti-Magic Shell) | *(none)*; `[oldtech]` for force-field / device-feel shields (Mage Armor) · `[ritual]` for consecrated wards and oath-bound abjurations | `[abjuration]` | `[ward]` `[imbued]` | `[force]` / domain tag |
| Detection (Detect Magic, Detect Evil, ESP, Clairvoyance, Locate Object) | `[oldtech]` | `[divination]` | `[detection]`; `[focus]` for sustained scrying | element/type tag (`[magic]` / `[evil]` / `[mind]`) |
| Hold / Control (Hold Person, Hold Monster, Charm Person, Charm Monster) | *(none)* · `[ritual]` for binding-register (Charm Person as geas, Geas/Quest itself) | `[enchantment]` | `[attack]` `[focus]` `[control]` | `[mind]` `[charm]` |
| Healing / Cure (Cure Light Wounds, Cure Disease, Neutralize Poison, Restore) | *(none)* | `[healing]` | `[vital]` for damage healed; `[cleanse]` for condition removal | `[life]` |
| Summoning / Animation (Animate Dead, Conjure Elemental, Insect Swarm, Invisible Stalker) | *(none)* · `[ritual]` for full creature-binding and corpse-animation | `[conjuration]` or `[necromancy]` | `[fueled]`; `[dangerous]` at P: 12+ | `[summon]` / `[undead]` / element tag |
| Illusion (Phantasmal Force, Mirror Image, Invisibility, Hallucinatory Terrain) | *(none)* | `[illusion]` | `[focus]` for active illusion; `[imbued]` for sustained forms (Invisibility) | `[illusion]` `[phantasm]` |
| Teleportation / Planar travel (Teleport, Dimension Door, Gate, Word of Recall) | *(none)*; `[fantascience]` for world-scale or no-save planar transport at P: 16+ | `[conjuration]` | `[movement]` `[teleport]`; `[dangerous]` at P: 12+ | `[void]` / `[astral]` |
| Terrain / Environmental (Wall of Fire, Ice Storm, Earthquake, Move Earth, Weather Control) | *(none)* | `[transmutation]` or `[evocation]` | `[area L]` `[anchored]` `[focus]` | `[earth]` / `[fire]` / `[cold]` / `[weather]` |
| Necromancy / Death-touch (Finger of Death, Disintegrate, Cause Serious Wounds, Wither) | *(none)*; `[fantascience]` for no-save instant-kill finishers (Power Word Kill, Disintegrate) · `[ritual]` for lifecycle-threshold effects (Raise Dead, Reincarnate as standalone cards) | `[necromancy]` | `[attack]` `[dangerous]` | `[death]` `[necrotic]` |

#### G. Charm and Control

- Charm/control spells express a **relationship state**, not ownership. The target treats the caster as a trusted ally or best friend, not as an absolute controller. Commands that require self-harm or betrayal of deep loyalties are refused.
- Charm breaks immediately if the caster attacks the charmed target. State this explicitly.
- Re-save cadence follows the target’s Intelligence: low INT creatures take longer to re-save; high INT creatures re-save frequently. Write this as referee guidance in the card body, not as a fixed interval.

#### H. Detection Spells

- Detection spells use a static range (typically short range ~18m/60ft), no save from the detected subject.
- They reveal presence but not always function or origin — state explicit limits (hidden objects, solid containers, etc.).
- Overcharge on detect spells provides: penetration of cover, clarification of function, or range extension. These effects may allow the target to save.

#### I. Material Components

OSR material components are dropped entirely. No SDM power card references components. The Life and Inventory costs are the mechanical replacement for component cost. When the source text has flavorful components (incense, mirrors, powdered iron), preserve them in the `osr:` block verbatim; do not import them into the SDM card body unless they carry narrative weight worth keeping as flavor text.

#### J. Class Gates

OSR class restrictions (Cleric-only, Magic-User only, Druid-only) are dropped. Any character with access to the power may use it. SDM replaces the class gate with the inventory slot requirement (trait or item), the Life cost, and optionally the [dangerous] tag for powers that punish unskilled use. Do not add a "wizards only" note to power cards.

[Synthesis, grounded in SDM Powers Index + FTLS_06_Powers.md pattern scan]

---

## Chapter 06 Module and Module Architecture

> **Workflow note:** Each module block contains (1) doctrine — placement rationale and SDM conversion rules; (2) sub-module inventory; and (3) a migration table populated by copying rows from the crosswalk module workspace (deleted from source after migration here).
>
> **STATUS markers:** `DRAFT` = work in progress · `APPROVED` = operator sign-off complete · `READY-TO-PROPAGATE` = cleared for Ch06 temp file pass.
>
> **Maintenance rule:** Once rows migrate here, this is the source of truth for those rows. Do not duplicate back into crosswalk module sections.
>
> **The Arcana Guard-Law.** The thirteen modules close as a set: the power modules name **verbs of will**; the procedural modules name **axes of system**. New content enters as a sub-module, a tag, a witness lane, or a procedural parameter — never as a new module. A fourteenth module requires a demonstrated new verb of will, and the burden of proof sits on the claimant. **Routing files a power; it does not essentialize it**: a power lives in one module for provenance and doctrine, and speaks as many modules' tag-vocabularies as its fiction earns (blends stay first-class). New corpora — Ars Magica, the Mage editions, and their kin — enter as witness lanes feeding the same thirteen, never as modules.

---

## Procedural Modules

---

### Module: ECM – Etheric Counter-Magitech

**STATUS: DRAFT**

#### Doctrine

ECM — Etheric Counter-Magitech — is a **procedural module**, not a power category. It defines the noospheric interference infrastructure that underlies all counter-magitech operations in SDM: how jamming, counterspell, anti-magic, scrying, illusion, glamour, and charm mechanics function as a unified system.

**Framing:** Every power use sends intent through the noosphere and expects reality to respond. ECM lives in that liminal space — glamours, illusions, charms, veils, and counter-signals that bend, blur, or divert intent before the world can finish listening. This distinguishes ECM from wards and armor, which block results after the signal lands. ECM spoils the conversation between sender and target: it fouls active powers, activations, and noospheric sensing *before* anything arrives.

**ECM’s scope:** Interrupting, suppressing, absorbing, reflecting, canceling, or spoofing active powers, activations, and noospheric sensing — including the Ba/Ka/Ha channels through which those activations travel. `[ecm]` as a tradition tag appears on power cards across multiple Power Modules — it marks heritage and tradition, not the module a power lives in.

*No migration rows in this module. All ECM-tradition power cards route to their respective Power Modules.*

#### ECM Tag Taxonomy

`[ecm]` marks tradition. Mode tags drive mechanical operation. Mode tags may appear without `[ecm]` on non-ECM powers (e.g. `[scan]` on a mundane detection power, `[veil]` on a stealth power).

**ECM mode tags — what the effect *does*:**

| Tag | Operation |
|---|---|
| `[scan]` | Detect or identify a noospheric signal: "who cast," "what is active," "what is being watched" |
| `[veil]` | Hide a signal: "don’t notice," "can’t lock on," "can’t trace," "can’t scry" |
| `[jam]` | Degrade activation or sensing inside a zone: power use becomes unreliable or expensive |
| `[spoof]` | Feed false signals: false targets, fake identities, fake locations, fake casting tells |
| `[negate]` | End an active power effect — it stops running |
| `[suppress]` | Temporarily disable an active effect without ending it — it returns when suppression ends |
| `[redirect]` | Shove an incoming effect sideways: left/right/up/down, ally/enemy swap, mirror back |
| `[capture]` | Intercept a power payload and store it as charge for later use |
| `[absorb]` | Eat power energy, converting it to Life, Ward, heat, or a burden (referee chooses fitting currency) |
| `[control]` | Take control of an active effect briefly — rewrite its target, parameters, or allegiance |

**Combinable tags (stack freely with ECM mode tags):**
`[illusion]` · `[glamour]` · `[charm]` · `[noosphere]` · `[dreamnet]` · `[ha]` · `[ka]` · `[ba]` · `[ward]` · `[daemon]` · `[field]` · `[ritual]`

#### Channels and Resolution

Name the channel and mode before declaring. ECM is a contest.

**Substrate — Ba/Ka/Ha:** These do not require a model of reality stacked into tidy shelves. They describe one world in more than one register. The **Hylosphere** is the coarse and stubborn side: matter, inertia, thresholds, coin-weight, boot leather, damp stone, and the testimony of ordinary senses. The **Noosphere** is the parallel information-layer: names that stick, oaths that bite, intent that leaves a wake, ley-line traffic, daemon routes, hauntings, mana weather, ghost-code, and the unseen but consequential furniture of the world. The **DreamNet and Dream Realms** arise where noospheric traffic grows stable enough to map, travel, fortify, and bargain through. ECM works anywhere that answers to naming, binding, signaling, routing, watching, or carried intent.

**Channels (what you’re targeting):**
- **Ba** (Psyche, Perception) — illusions, glamours, veils
- **Ka** (Soul, Desire) — charms, compulsions, commands
- **Ha** (Body, Integrity) — wards, names, anchor-locks, bindings

**Resolution — pick one:**
- **Automatic:** your Level ≥ source Level and the mode fits → works, no roll
- **Save:** mental/spiritual contest → target rolls **Aura save** (Ward applies); Save = fail/partial; Sacrifice = works with cost; Doom = full effect
- **Skill roll:** active intrusion → d20 + Thought vs. 13 + (Target Level − Your Level) + mods; failure may generate noospheric noise or increase local Area Attention
- **Danger roll:** triggered by `[dangerous]` powers, casting or overcharging above your level, overlapping fields, or jamming a shrine node / daemon route / DreamNet boundary; Price of the ECM power is the Danger target number

**Scale:**
- *Personal* — counter a bolt, jam a room, veil your casting
- *Company* — route integrity, node access, alignment rites
- *Faction* — deny rival activation across an Area, spoof shrines, poison DreamNet routes
- *Mythic* — shrine disruptions, daemon contract edits, Dream Realm quarantine

Inside a Dream Realm, ECM is network security. Outside, it’s fieldcraft. Same noosphere, different density.

#### ECM Sub-module Routing

The beta-rules chapter organizes ECM behaviors into sub-categories. When converting BECMI entries, use these routing rules to assign power cards to the correct Power Module.

**Counterspells (`[negate][suppress][redirect][capture][control]`):**
→ **Mana, Counterspells, and Jamming** (Power Module)
Hard-counter operations — ending, pausing, turning, storing, and stealing active effects. ECM targets *active effects and power activations.* It does not erase an item’s lifelong weirdness unless that weirdness is currently running as an effect.

**Jamming Fields (`[jam][field]`, add `[aversion]` for repulsion fields):**
→ **Mana, Counterspells, and Jamming** (Power Module)
Degrades or blocks power use and/or scrying inside a boundary. Field types: *Bilateral* (blocks everyone including caster); *Directional* (blocks one crossing direction); *Selective* (blocks by activation mode — voice, gesture, anchor type, daemon channel). Stacking rule: two overlapping jamming fields do not add — they create pressure. Higher Level field dominates; overlap without Level dominance = Dangerous Magic.

**Scrying and Anti-Scrying (`[scan][veil][jam]`):**
→ **Detection and Analysis** (Power Module)
Scrying is etheric reconnaissance of the noospheric substrate — scanning for signals, names, routes, and dreams. When a scry crosses a meaningful boundary (warded room, shrine node, lair, DreamNet gate), it triggers a contest: Aura/Ward vs. the scry, or Thought roll vs. Area Level. Anti-scrying (veil/jam/spoof the probe) is the corresponding defense.

**Veiling and Revealing (`[veil][reveal]`):**
→ **Detection and Analysis** and **Illusion and Glamour** (Power Modules) — by effect register
Veiling hides targets from mundane perception, noospheric sensing, and casting detection. Reveal/Burn-Through is counter-ECM: active probing that forces a target to "resolve" and become targetable. Design balance: if veiling is cheap, revealing should be cheap too; if veiling is expensive or Overcharged, revealing should require Overcharge, sacrifice, or specialized wards.

**Glamours (`[glamour][spoof][veil]`):**
→ **Illusion and Glamour** (Power Module)
Identity-layer ECM: spoofs recognition, authority, beauty, threat, and "who you are" signals. Not mind control — targeted misregistration of the noosphere’s identity-lookup. Strongest against crowds, bored guards, and low-attention systems; breaks when proof matters (close interview, ritual verification, warded gate, legal recitation). Glamour tells (copper scent, halo edge, mirrored blink) are detectable by skilled observers.

**Illusions (`[illusion][figment][spoof][jam][veil]`):**
→ **Illusion and Glamour** (Power Module)
Perception-layer ECM. Two classes: **Figments** (sensory spoofs — distract, misdirect; meaningful interaction triggers a Sensing chance; collapse for that observer on success); **Illusion proper / schema writes** (can cause real harm by forcing false reality-layer; require a conscious/mindlike process; resisted by Aura save; create burdens on failure). Paired Slot Doctrine: many illusion powers ship as a paired mode in one slot — True mode (weaker, real, cannot be disbelieved) and Illusion mode (stronger, gains Overcharge hooks, adds Sensing/Disbelief riders). See **Illusion and Glamour** module doctrine for full detail.

**Charms (`[charm][spoof][control]`):**
→ **Binding and Compulsion** (Power Module)
Desire/obedience ECM on the Ka channel — injecting impulses, framed certainties, cravings, taboos, and short command-patterns. Not "remote puppetry" by default: charms are *steering, binding, and permission edits* unless Overcharged. On Sacrifice: charm works but target immediately gets a clue that something pushed them. On Doom: full effect; may impose a burden ("Compelled," "Infatuated," "Shamed," etc.). Charm breaks immediately if the caster attacks the charmed target. Re-save cadence by target Intelligence: low INT → slow; high INT → frequent. See Section G and **Binding and Compulsion** module doctrine.

---

### Module: Ritual Mechanics — Cross-Module Procedures

**STATUS: DRAFT**

#### Doctrine

A short procedural module covering mechanics that apply across families when a power is activated as a ritual. Four planned sections:

1. **Ritual Activation** — what triggers the ritual form of a power: time, place, material conditions, number of participants
2. **Component and Time Cost** — how ritual activation trades Life cost for time+material costs
3. **Interruption and Corruption** — consequences when a ritual breaks mid-cast; corruption trajectory for P: 12+ rituals
4. **Cross-Reference Index** — spells that support or require ritual activation: Permanence, Contingency, Symbol; Immortal-grade operations are covered in the Ascension module

Ritual Mechanics is **procedure-only**. Spell cards that use ritual governance (including `Permanence`, `Contingency`, `Symbol`, `Wish`, `Timestop`, and `Wizardry`) are routed to their owning spell modules; this module retains only cross-module procedure rows. Use the trends and patterns in the SDM Powers Index to ground this section before looking at the OSR Powers.

#### Migration Tables

##### Cross-Module Procedures

| Classic Name | Type | Notes | Mapping Status |
| --- | --- | --- | --- |
| Magic-User Starting Spell Choice | procedure | Spellbook seeding: Read Magic mandatory as first gift; referee may control spell access. | custom |

---

### Module: Ascension

**STATUS: DRAFT**

#### Doctrine

Covers **how a will climbs**: acquisition, initiation, rank, unlock, and apotheosis — from a mortal's first seeded power through the Immortal ceiling. The room holds no playable power collection — it holds the rules infrastructure that sits above all other modules, governing how standing in the arcana is earned, gated, and priced at every tier. Its mortal-side floor seats the rank-tag economy (`[skilled]` / `[expert]` / `[master]`), initiation-unlock rites (the partially-locked-gift pattern), and starting-power seeding; its upper stories keep the Immortal-tier procedures. An Immortal’s expressions of power draw from every other module; these rows specify how that expression is structured, costed, scaled, and adjudicated at the Immortal tier.

Source: `Immortals -> Sections 1–2` (rank economics and sphere context) and `Immortals -> Section 3: Immortal Magic` (effect doctrine). The Catalog notes that "no unique Phase 1 spell rows are currently Immortals-primary; Immortals remains represented as a co-source lane within relevant rows." All rows here are therefore `procedure` type and contain no power-card expressions.

Distinct from Ritual Mechanics (mortal-level ritual activation doctrine) and from any of the twelve other modules — each of which may still apply when an Immortal activates that class of effect. These rows govern the frame and the override layer, not the effect type.

**Sub-modules:**
- **Rank and Initiation (mortal-side)** — the canonical rank-tag rule (`[skilled]` / `[expert]` / `[master]` gate riders, overcharge options, and recipe grades; matching Path/Background skill rank or roll with Disadvantage), initiation-unlock rites (partially-locked powers opened by rite; rank-tag upgrades by further initiation), and starting-power seeding (Magic-User Starting Spell Choice lands here). This sub-module seats the rule that FTLS Ch04 (RSS Recipes), Ch05 (Anomalous Object Recipes), and Ch06 (Rank and Power Economy placeholder) all defer to — the deferral chain resolves HERE.
- **Rank and Power Economy** — PP conversion from mortal XP, rank/level frame, GT advancement gate, sphere selection and recovery cadence; the structural accounting layer (`Immortals -> Sections 1–2`)
- **Immortal Effect Doctrine** — sphere-factor cost model, magical effect index (S1-S4), caster level rule, range/duration scaling, damage scaling and averaging, limits on use, effect explanation overrides, plus transplanar exception rows for conjuring/summoning limits, mental effect resolution, and undead/entropy curing (`Immortals -> Section 3: Immortal Magic`)

**SDM Conversion Notes:**
- All rows `procedure` type; none generate power cards directly
- Rank and Economy rows inform SDM Chapter 05 PP cost infrastructure; cross-reference before building high-tier PP tables
- Mortal-side rank/initiation rows resolve the Ch04/Ch05/Ch06 rank-tag deferral chain; when P0 restructures Ch06, the Rank and Power Economy placeholder section re-points here
- Effect Doctrine rows constrain how other module conversion notes apply when the caster is an Immortal
- Transplanar exception rows (conjuring limits, mental resolution, undead curing) forward-reference their host modules: each host module notes the Immortal-tier override lives here

#### Migration Tables

##### Rank and Power Economy

| Classic Name | Type | Notes | Mapping Status |
| --- | --- | --- | --- |
| Immortal Power Point Conversion And Bookkeeping | procedure | Converts mortal XP to permanent and current PP tracks; temporary versus permanent expenditure. | custom |
| Immortal Rank And Level Frame | procedure | PP total determines rank; level tracks progress within rank; gains key off Immortal hierarchy. | custom |
| Immortal GT Advancement Costs And Gate | procedure | Permanent-PP advancement: ability-score costs by rank; Greater Talent maxima before rank advancement. | custom |
| Immortal Sphere Bias And Recovery | procedure | Sphere-selection and planar-bias doctrine linking alignment context, PP regeneration, hp/ability recovery to hostile/neutral/friendly bias. | custom |

##### Immortal Effect Doctrine

| Classic Name | Type | Notes | Mapping Status |
| --- | --- | --- | --- |
| Immortal Sphere-Factor Cost Model | procedure | Base PP cost × Sphere relationship factor; dominance/opposition as formal cost model. | custom |
| Immortal Magical Effect Index (S1-S4) | procedure | Indexed PP vocabulary unifying mortal spells and non-spell effects; core bridge for Chapter 05 power-cost unification. | custom |
| Immortal Caster Level Rule | procedure | Effective caster level equals 2×HD for all created effects and dispel interactions. | custom |
| Immortal Range / Duration Scaling | procedure | Cost-doubling to extend range, duration, volume; no cross-planar reach without path; instant/permanent effects cannot be extended. | custom |
| Immortal Damage Scaling And Averaging | procedure | HD-scaled damage expression: 1d6 per HD of creator; average-damage substitution explicitly encouraged for speed; per-die modifiers clamped by die’s natural min/max. | custom |
| Immortal Limits On Use | procedure | Action-economy: one magical action OR physical attacks per round; self-only effects by touch; mortal magic cannot affect Immortals. | custom |
| Immortal Effect Explanation Overrides | procedure | Rules-precedence doctrine for Immortal-tier effects. | custom |
| Immortal Conjuring And Summoning Limits | procedure | Transplanar response requirements and sphere/element bias constraints; hostile bias blocks nominally valid summoning. Cross-note: Summoning and Binding module. | custom |
| Immortal Mental Effect Resolution | procedure | Non-magical recovery cadence for charmed/feebleminded Immortals; Intelligence-check cadence plus renewed saves; magical self-cure unavailable. Cross-note: Psychic Warfare module. | custom |
| Immortal Undead / Entropy Curing | procedure | At Immortal tier, undead-curative magic re-reads as Entropy-creature healing; affinity-based target remapping. Cross-note: Rites of the Deathless module. | custom |

---

## Power Modules

---

### Module: Mana, Counterspells, and Jamming

**STATUS: DRAFT**

#### Doctrine

Covers all powers that suppress, cancel, absorb, reflect, or jam magical effects — the active power expressions of ECM-tradition interference. Distinct from Binding (behavioral obligation) and Psychic Warfare (Ka-mind attack). These powers operate on magic itself as a substrate: they treat spells and magical fields as signals to be cut, caught, turned, or silenced.

**Sub-modules:**
- **Mana** — wild mana handling and reckless discharge; trait-seated (overflow to Burdens); *Reckless Dweomer* is the anchor power
- **Jamming / Counterspells** — anti-magic fields, dispel mechanics, spell-absorption items, silence fields; `[negate][suppress][ecm]`

**SDM Conversion Notes:**
- Reckless Dweomer → trait-seated with Burden overflow; `[mana][oldtech][dangerous]` tags; Very Dangerous (cascading Dangerous Magic rolls while carrying Mana and on any Defeat roll); no overcharge; cannot cast while Mana is held in a Trait slot; see Mana sub-module doctrine below
- Anti-magic and dispel effects → `[negate][suppress]`; `[area]` for field forms; `[dangerous]` at P: 12+
- Silence → `[suppress][ecm]`; partial jam (speech/casting only)
- Spell-catching / spell-turning items → `[store:spell][ecm]`; trigger notes on capacity and dormancy

#### Migration Tables

##### Mana

The Mana sub-module covers wild mana handling, reckless activation, and the mechanical cost infrastructure for pushing power use beyond safe limits. *Reckless Dweomer* (FTLS_06) is the canonical anchor: roll 1d6 + Aura, gain that much Mana stored in a Trait inventory slot; overflow goes to Burdens if no Trait slot is free; Mana may be spent in place of Life to cast powers. Seat doctrine: trait — Mana lives in a Trait slot by default and overflows to Burdens only when no slot exists. The burden state is a consequence of overflow, not the primary seat. Danger escalation: if Mana gained exceeds effective level, immediately make a Dangerous Magic roll; while carrying Mana, any Defeat roll or other Dangerous Magic roll triggers an additional Dangerous Magic roll (Very Dangerous). Mana disperses at the next sunset or sunrise.

BECMI source material does not map directly to a Mana sub-module — there is no BECMI spell that cleanly corresponds to "accept a burden to overcharge a casting." This sub-module is a **synthesis lane**: Reckless Dweomer and kin are SDM inventions grounded in the overcharge and Danger Roll infrastructure, and BECMI conversion only contributes to it indirectly (e.g. reckless-casting rulings that emerge during Danger Roll adjudication). Populate migration rows here when Chapter 05 (Magitech & Fantascience) or Phase 2 specifically generates Mana-class cards.

*No migration rows in this pass.*

##### Counterspells and Jamming

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Anti-Magic Shell | spell | MU6 · Expert, Master, RC | Major counter-magic boundary. Range 0 (caster only), 12 turns; stops all spells both directions; only Wish bypasses; dismissible at will. | custom | no |
| Anti-Magic Ray | item-effect | — · Master | Directional cancellation beam. Range 120', 1d6 rounds; suppresses all magic in area/target; area moves with beam; no save. | custom | — |
| Protection from Magic | item-effect | — · Expert, RC | Moving 10' circle blocks spells crossing boundary; only Wish ends early; lasts 1-4 turns. | custom | — |
| Dispel Magic | spell | C4/MU3 · Expert, RC | Core ECM counterforce anchor. 20' cube; auto-dispels equal/lower caster-level magic; fails 5% per higher level; does not affect ordinary magic items. | custom | no |
| Silence 15' Radius | spell | C2 · Expert, RC | Anti-speech and anti-casting field; partial noospheric jam. 30' sphere suppresses speech and casting inside; hearing from outside still works. | partial | no |
| Spell Catching | item-effect | — · Companion, RC | Counter-capture of hostile spell into storage media. Save vs. Spells on success; captured spell usable once within 24 hours. | custom | — |
| Ring of Spell Eating (cursed) | item-effect | — · Companion, RC | Source witness (rc_full.txt:17383, companion_full.txt:6199): CURSE ring — appears/functions as spell turning, then eats the wearer's own memorized spells; cannot be removed below a remove curse from a 25th+ level caster; dispel evil by 36th-level caster upgrades it to a true ring of spell turning. Curse-face seats toward burden. | custom | — |
| Ring of Spell Eating (uncursed variant) | item-effect | — · community: BG3 mod scene | Community-lineage build (operator-attested 2026-08-19, Baldur's Gate 3 online mod community — NOT in the staged BECMI corpus): spell absorption ring; damage spells heal wearer; non-damage spells canceled; 10th use in a day triggers 24h dormancy. Kept as named variant beside the cursed source face; enters at community register. | custom | — |
| Ring of Spell Turning | item-effect | — · Expert, RC | Reflects 2-12 incoming spells back at casters; true spells only (not monster spell-like powers or item-borne effects). | custom | — |
| Staff of Dispelling | item-effect | — · Companion, RC | Touch-based targeted dispel; special handling for potions, scrolls, and permanent items. | custom | — |
| Wand of Negation | item-effect | — · Expert | Narrow ECM wand that cancels one other wand or staff effect instead of countering free-cast spells; if the canceled effect has duration the negation persists for one round. | custom | — |

---

### Module: Battle, Elements, and Force

**STATUS: DRAFT**

#### Doctrine

Covers all powers that project, manipulate, or protect against elemental forces and physical violence. The kinetic engine of the power list — artillery, area denial, elemental manifestations, and force effects that do not involve summoning entities.

**Sub-modules:**
- **Force** — non-elemental physical force effects — projectile and discharge (Magic Missile, Lightning Bolt, Call Lightning, Sword, Ray of Enfeeblement, Slow), traversal and levitation (Levitate, Floating Disc, Fly), barriers (Barrier, Force Field), and personal force protection (Protection from Lightning, Immunity)
- **Elemental Fire** — fire projection, protection, and area blast effects; fireburst ladder spells carry `[artillery]` (Fireball, Delayed Blast Fireball, Meteor Swarm, Pyrotechnics, Wall of Fire, Produce Fire, Heat Metal, Resist Fire)
- **Elemental Ice / Cold** — cold projection and protection (Ice Storm/Wall, Resist Cold)
- **Elemental Earth** — terrain force and earthwork (Earthquake, Move Earth, Wall of Stone)
- **Elemental Air / Weather** — atmospheric effects and weather control (Control Winds, Control Temperature 10' Radius, Weather Control, Summon Weather, Obscure)
- **Elemental Water** — hydrology control (Lower Water)
- **Demolition / Entropy** — matter and life erasure (Death Spell, Disintegrate, Power Word Blind, Power Word Kill)
- **Atmospheric Hazards** — noxious area denial (Cloudkill, Explosive Cloud, Insect Plague)

**Split rule — Summoning vs. Elemental Force:** `Conjure Elemental` and `Summon Elemental` are NOT in this module — they call entities. Elemental projection spells manifest force directly with no entity invoked. Distinction: *does the effect persist because an independent being is doing the work?* Yes → Summoning module. No → this module.

**SDM Conversion Notes:**
- Elemental Fire (fireburst) blasts → `[attack][area M/L]`; add `[artillery]` on Fireball-ladder spells; P: 12+ auto-`[dangerous]` per §3
- `Power Word Kill` → `[dangerous]` regardless of P: formula (no-save instant kill)
- Wall effects → `[anchored]`; dual-mode walls (Ice Storm/Wall) = single card with cast-time choice
- Force traversal (Levitate, Floating Disc, Fly) → `[force][imbued]`; no entity invoked; the caster generates or rides a conjured force field
- Immunity (Force personal shell) → `[ward][imbued][force]`; hazard type specified at cast (acid/electricity/fire/cold/gas-poison/petrification); affects worn items but **not** held items
- Control/weather effects → `[focus][area L]` + narrative duration form
- **Force tagset — lightning effects:** Lightning bolt and call lightning models are channelled directional discharge rather than elemental projection; they belong to Force because the effect is shaped, aimed physics (a line or a strike), not a summoned elemental phenomenon. Tags: `[attack][line][lightning][force]` for Lightning Bolt; `[attack][lightning][force][focus]` for Call Lightning (sustained, one bolt per turn). Protection from Lightning is the defensive mirror: `[ward][imbued][lightning][force]`. All three may carry `[fantascience]` if the table fiction frames them as sorcery-tech discharge rather than nature-call.

#### Migration Tables

Rows copied from `## Powers Module Workspace For Chapter 06` in `TODO_BECMI_Spell_Effect_Crosswalk.md`; deleted from source module after migration.

##### Force

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Magic Missile | spell | MU1 · Basic, Expert, RC | Canonical Chapter 06 entry. Existing SDM variant: `Tragic Missile` (Vastlands). | partial | no |
| Lightning Bolt | spell | MU3 · Expert, RC | Core line-discharge. Shaped, aimed electrical force rather than elemental projection — tags `[attack][line][lightning][force]`. | direct | no |
| Ray of Enfeeblement | spell | MU2 · Holmes | Combat-debuff beam suppressing physical output. 30' ray, save negates; -4 Str-equiv for duration; 25% damage reduction per 4 points lost. | partial | no |
| Slow | spell | MU3 · Men & Magic | Tempo-denial counterpart to `Haste`; broad-area slowing up to 24 creatures for 3 turns. | partial | no |
| Spell Damage Bonus | item-effect | — | Artifact-table damage rider; +1d6 per spell level (max +6d6); one-use-per-artifact-activation. Applies to any blast regardless of sub-module; cross-listed with Elemental Fire (fireburst lane). | custom | — |
| Call Lightning | spell | Dr3 · Companion, Master, RC | Sustained directional electrical strike via storm-channel; one 20' bolt per turn for duration, 8d6 save-for-half. Tags `[attack][lightning][force][focus]`. Requires active storm; more sustain-tool than pure artillery. | partial | no |
| Sword | spell | MU7 · Companion, RC | Concentration-directed force blade at 30'; attacks twice/round at caster attack level; two-handed sword damage; concentration break pauses but does not end duration. | partial | no |
| Protection from Lightning | spell | Dr4 · Companion, Master, RC | Defensive mirror of the lightning discharge sub-module. Level-scaled d6 cancellation pool against electrical attacks; persists across multiple hits until exhausted. Tags `[ward][imbued][lightning][force]`. | partial | no |
| Barrier | spell | C6 · Companion, RC | 30' dia × 30' h whirling-hammer zone; 7d10 no-save on crossing; Reverse removes barrier + specific wall forms; cannot affect iron/stone forms. | custom | no |
| Force Field | spell | MU8 · Master, RC | Immovable pure-force barrier; sphere (max 20' r) or flat surfaces up to 5,000 sq ft; only Disintegrate/Wish destroys; Teleport/Dimension Door can bypass; enclosed creatures preserved. | custom | no |
| Levitate | spell | MU2 · Expert, RC | Vertical force-lift; personal scale; self or one target rises or descends at will; horizontal movement requires a hand-hold or surface push. Tags `[force][imbued]`. | direct | no |
| Floating Disc | spell | MU1 · Basic, Expert, RC | Conjured force platform for cargo transit; follows caster; cannot carry living targets; height fixed. Existing SDM variant: `Floating Disc` (UVG2e Spells). Tags `[force][imbued]`. | direct | no |
| Fly | spell | MU3 · Expert, RC | Full personal aerial mobility via conjured force field; no entity invoked; speed and duration scale by caster level. Tags `[force][imbued]`. | direct | no |
| Immunity | spell | MU9 · Master, RC | Personal force-barrier shell keyed to one hazard type specified at casting (acid/electricity/fire/cold/gas-poison/petrification); 24 hours; no stacking. The shell fits skin- and clothing-tight — affects worn items but not held items. Tags `[ward][imbued][force]`. | custom | no |
| Shield Ward | spell | MU1 · Basic, Expert, RC | Personal defense shell; canonical Ch06 name `Shield Ward`, source alias `Shield`. `Entropic Shield` is the sibling FTLS variant. Tags `[ward][imbued][force]`. | direct | — |
| Reverse Gravity | spell | MU7 · Master, RC | Battlefield-physics inversion and area-control exception effect; custom environmental resolution rather than ordinary force-attack mapping. | custom | no |
| Telekinesis | spell | MU5 · Master, RC | Classic force-manipulation; compare `Objective Telekinesis` as likely SDM cousin. Tags `[force][focus]`. | partial | no |
| Wall of Iron | spell | MU6 · Master, RC | Durable material barrier and infrastructure-fabrication lane for persistent iron mass; custom until construction doctrine and breach rules defined. | custom | no |
| Maze | spell | MU9 · Master, RC | Custom exile and battlefield-removal boundary effect with spatial-separation logic and explicit return-condition doctrine. | custom | no |
| Power Word Stun | spell | MU7 · Master, RC | HP-threshold stun with tiered duration; no save below threshold, resisted at higher HP. | partial | no |
| Striking | spell | C3 · Expert, RC | Weapon augmentation and combat support. Existing SDM variant: `Imbue Edge`. Tags `[attack][imbued]`. | partial | no |
| Anti-Animal Shell | spell | Dr6 · Companion, Master, RC | Creature-class exclusion boundary for fauna and beast-adjacent targets; custom barrier-interface doctrine for who is denied passage. | custom | no |
| Anti-Plant Shell | spell | Dr5 · Companion, Master, RC | Vegetation-class exclusion boundary; custom barrier-interface for passage denial against plant entities and effects. | custom | no |
| Protection from Normal Missiles | spell | MU3 · Expert, RC | Projectile-denial ward for non-magical missile vectors; interface-grade filtering with explicit projectile-category exceptions. | custom | no |
| Protection from Evil | spell | C1/MU1 · Basic, Expert, RC | Hybrid defensive buff plus contact ward against enchanted, conjured, or summoned beings; +1 saves, −1 to evil attacker rolls; not a generic alignment scanner. Shared cleric/arcane lane. | partial | no |
| Protection from Evil 10' Radius | spell | C4/MU3 · Expert, RC | Group-radius expansion of the `Protection from Evil` lane; lowercase `10' radius` retained as source alias only; partial module variant. | partial | no |
| Knock | spell | MU2 · Expert, RC | Canonical lock-opening entry. Stuckforce-physics application of security wards to ndoors and barriers; Existing SDM variant: `Knock / Lock` (UVG2e). Tags `[force]`. | partial | no |

##### Elemental Fire

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Fireball | spell | MU3 · Basic, Expert, Master, RC | Area fireburst, `[artillery]` tag. Canonical name; preserve `Fire Ball` as recognizer alias. SDM variant: `Pyreball`. Base fireburst anchor beneath Delayed Blast Fireball and Meteor Swarm. | partial | no |
| Delayed Blast Fireball | spell | MU7 · RC, Master | Timed artillery fireburst, `[artillery]` tag. Middle rung between `Fireball` and `Meteor Swarm`. | partial | no |
| Meteor Swarm | spell | MU9 · Master, RC | Apex fireburst, `[artillery]` tag. Range 240', 1-4 × 40' radius impacts, 10d10 fire, save-for-half, terrain hazard persistence. | custom | no |
| Pyrotechnics | spell | MU2 · Greyhawk, Holmes | Pivot between spectacle and smoke denial. Requires existing fire source; extinguishes on use. | partial | no |
| Wall of Fire | spell | MU4 · Expert, RC | Barrier-plus-damage; fire-module partial recognizer alongside `Pyreball`. | partial | no |
| Produce Fire | spell | Dr2 · Companion, Master, RC | Conjures non-self-harming torch-grade flame; duration scaling; ignition utility; short-range throw/drop; on/off toggle by concentration. | partial | no |
| Heat Metal | spell | Dr2 · Master, RC | Sustained anti-armor fire effect. 7 rounds escalating→tapering no-save damage; forced drop; ignition at peak; weaker on magical targets. | custom | no |
| Resist Fire | spell | C2 · Expert, RC | Fire resistance and mitigation. Direct map. | direct | no |

##### Elemental Ice / Cold

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Ice Storm/Wall | spell | MU4 · Expert, RC | Dual-mode: burst (damage, save-for-half) or wall (breach damage, creature-type exceptions). Single card, cast-time choice. | custom | no |
| Resist Cold | spell | C1 · Basic, RC | Range 0, Duration 6 turns, effect all creatures within 30'. Cold-hazard taxonomy still open. | partial | no |

##### Elemental Earth

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Earthquake | spell | C7 · Companion, Master, RC | Outdoor area up to 60' sq + 5'/level above C17; 1 turn of collapse, rockslide, and crack-engulf risks. | custom | no |
| Move Earth | spell | MU6 · Master, RC | Massive terrain repositioning. SDM cousin: `Dryland Sculpture` (smaller-scale terraforming). | partial | no |
| Wall of Stone | spell | MU5 · Expert, RC | Rapid-structure and barrier creation; geometry, breach, and noncombat construction doctrine still needed. | custom | no |
| Entangle | spell | MU2 · RC | RC-only vegetation restraint lane; no standalone pre-RC spell witness. Restrains targets in vegetation with escape mechanics. | partial | no |
| Growth of Plants | spell | MU4 · Expert, RC | Terrain and vegetation alteration lane. SDM cousin: `Green Haven` (narrower plant-shaping). | partial | no |

##### Elemental Air / Weather

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Control Temperature 10' Radius | spell | Dr4 · Companion, Master, RC | Self-centered 20' dia microclimate; immediate ±50°F shift; round-by-round retuning while active; fixed end-state at duration expiry. | partial | no |
| Control Winds | spell | Dr5 · Companion, Master, RC | Directional weather-force control; movement, hazard, projectile-pressure implications. Await full weather-suite doctrine. | custom | no |
| Weather Control | spell | Dr7/MU6 · Companion, Master, RC | Chapter-scale climate control and hazard shaping across druidic and arcane traditions. | custom | no |
| Obscure | spell | Dr2 · Companion, Master, RC | Atmospheric concealment lane. SDM variant: `Yellow Cloud` (opaque dust veil). Works by altering atmosphere, not false imagery. | partial | no |
| Summon Weather | spell | Dr6 · Companion, Master, RC | Macro-environment override; doctrine pending for intensity, duration, and collateral effects. | custom | no |

##### Elemental Water

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Lower Water | spell | MU6 · Expert, RC | Halves water depth up to 10,000 sq ft for 10 turns; can strand vessels; hazardous refill surge on end. | custom | no |

##### Demolition / Entropy

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Death Spell | spell | MU6 · Expert, RC | 4-32 HD kill budget in 60' cube; lowest-HD targets first; excludes undead and 8+ HD. | custom | no |
| Disintegrate | spell | MU6 · Expert, RC | Single-target annihilation. Death Ray save allowed; no effect on magic items. | custom | no |
| Power Word Blind | spell | MU8 · Master, RC | No-save blindness at 120'; HP threshold determines duration; AC/save penalties; restricted cure access. | partial | no |
| Power Word Kill | spell | MU9 · Master, RC | HP threshold execution (kill / stun / narrow save). Auto-`[dangerous]` regardless of P: formula. | custom | no |

##### Atmospheric Hazards

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Cloudkill | spell | MU5 · Expert, RC | Drifting poison cloud 30'×20'; ongoing damage; sub-5 HD targets risk death save. | custom | no |
| Explosive Cloud | spell | MU8 · Master, RC | Cloudkill-profile cloud + repeat paralysis saves + unavoidable explosion damage bypassing elemental immunities. | custom | no |
| Insect Plague | spell | C5 · Companion, RC | Outdoor 30' radius swarm for 1 day; drives off sub-3 HD creatures; obscures vision; concentration to steer. | custom | no |
| Creeping Doom | spell | Dr7 · Companion, Master, RC | High-tier swarm devastation: expandable 20'×20' to 60'×60' column of 1,000 insects; automatic scaling damage while caster is within 120'; ends on expiry, range break, or dispel. | custom | no |

---

### Module: Biomancy

**STATUS: DRAFT**

#### Doctrine

Covers all powers that operate on biological systems — tissue repair, metabolic control, life support, sensory augmentation, and organic processes. Historically split across Healing, Transformation, and Detection legacy families; these form a coherent tradition in SDM.

**Register note (Grey’s Anatomy anchor):** Biomancy healing cards should read like procedures. The practitioner assesses damage, diagnoses, and applies targeted intervention. Not "wave and Life returns" — but: identify the trauma, stabilize the bleed, flush the system, monitor recovery trajectory. Language should be clinical-metabolic even when the fiction is fantastical: *tissue, systemic, toxin clearance, pressure, rate, organ function.*

**Sub-modules:**
- **Acute Medical Care** — rapid wound stabilization and emergency repair (Cure Light/Serious/Critical Wounds, Cureall, Heal)
- **Systemic Treatment** — organ, toxin, and affliction intervention (Cure Blindness, Cure Disease, Neutralize Poison, Protection from Poison, Ring of Remedies, Rod of Health)
- **Life Support / Metabolic Sustenance** — survival, nutrition, atmosphere (Create Food, Create Water, Create Air, Purify Food and Water, Survival, Ring of Survival)
- **Biotic Augmentation** — metabolic speed and physical enhancement (Haste + stacking rules, Strength, Ring of Life Protection)
- **Sensory Augmentation** — biological enhancement of perception (Infravision)
- **Faerie Bodycrafts** — biological transformation and organic material production: dual-use organic extrusion (Web: silk/filament/area-restraint at high P); form-shift and size-change (Polymorph suite, Enlargement, Animal Growth, Stone to Flesh); Spider Folk and Faerie traditions root here

**NOT in Biomancy — adjacent distinctions:**
- *Raise Dead, Raise Dead Fully, Restore* → Rites of the Deathless (soul-tract restoration, not tissue repair)
- *Polymorph, Shapechange, Enlargement, Animal Growth, Stone to Flesh* → Faerie Bodycrafts (biological transformation; form HD cap required for polymorph forms)
- *Resist Cold, Resist Fire* → Battle/Force/Elementals (elemental defense layers); *Immunity* → Force sub-module (personal force shell, keyed by hazard type; worn-not-held distinction)
- *Remove Curse, Bless, Dispel Evil* → Rites of the Deathless Ka Restoration sub-module (Ka-channel program removal)

**SDM Conversion Notes:**
- Healing powers → `[healing][vital]`; trait seat default
- Cure-condition powers → `[cleanse]`; add `[vital]` only when Life is also restored
- Metabolic augmentation → `[vital][focus]` + explicit exhaustion burden risk (confirmed by `Nunka's Biophysical Overdrive`)
- Sensory augmentation → `[vital][imbued]` (persistent biological modification)
- Item-side variants (Ring of Remedies, Ring of Survival, Rod of Health) → item-seated

#### Migration Tables

##### Acute Medical Care

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Cure Critical Wounds | spell | C5 · Companion, RC | Higher-tier healing upgrade. | direct | no |
| Cureall | spell | C6 · Companion, RC | Heals all wounds to 1d6 remaining OR removes one named condition; enables just-raised creatures to skip mandatory 2-week recovery rest. | partial | no |
| Heal | spell | MU9 · Master, RC | Arcane capstone of broad-repair pattern; effect identical to Cureall; crosses clerical and arcane traditions. | custom | no |
| Cure Light Wounds | spell | C1 · Basic, Expert, RC | Foundational healing. SDM cousins: `Rehoryan's Progressive Restoration`, `Restorative Slumber`. Reversable: `Cause Light Wounds` — reversed form inflicts damage equal to the healing amount; Chaotic channel; same P: cost. | partial | no |
| Cure Serious Wounds | spell | C4 · Expert, RC | Mid-tier healing. SDM cousins: `Rehoryan's Progressive Restoration`, `Real-Time Rebuild`. Reversable: `Cause Serious Wounds` — reversed form inflicts damage at same tier; Chaotic channel; same P: cost. | partial | no |

##### Systemic Treatment

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Cure Blindness | spell | C3 · Expert, RC | Sensory impairment removal. SDM cousins: `Real-Time Rebuild`, `Restorative Slumber`. | partial | no |
| Cure Disease | spell | C3 · Expert, RC | Disease and affliction removal. SDM cousin: `Real-Time Rebuild` (flushes toxins/afflictions by power setting). | partial | no |
| Neutralize Poison | spell | C4 · Expert, RC | Poison-cleansing and creation lane. SDM cousin: `Real-Time Rebuild` (toxin flush at lower settings). Reversable: `Cause Poison` — reversed form injects lethal toxin; save-gated death rider; RC (*) mark confirmed. | partial | no |
| Protection from Poison | spell | Dr3 · Master, RC | Poison immunity and anti-breath protection. Only partial: `Real-Time Rebuild` is recovery-style rather than prophylactic. | partial | no |
| Ring of Remedies | item-effect | — · Companion, RC | Bundled cure functions (Cure Light Wounds/Blindness/Disease/Poison 1/day each); combine two uses in one touch allowed. | custom | — |
| Rod of Health | item-effect | — · Companion, RC | Renewable healing access; one function per creature per day. | partial | — |
| Stone to Flesh | spell | MU6 · Expert, RC | Petrification-reversal lane and biological restoration. Expert evidence: restores petrified targets or converts stone to flesh; reverse `Flesh to Stone` is save-gated petrification. | partial | no |

##### Life Support / Metabolic Sustenance

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Create Air | spell | MU3 · RC | Sealed-space and vacuum life support. RC-only provenance exception (no pre-RC spell witness found). | custom | no |
| Create Food | spell | C5 · Companion, RC | Supply-generation. SDM cousin: `Process Food`; `Green Haven` as camp-support variant. | partial | no |
| Create Water | spell | C4 · Expert, RC | Liquid-resource generation. SDM cousins: `Process Food`, survival wrappers. | partial | no |
| Purify Food and Water | spell | C1 · Basic, RC | Basic purification. SDM cousin: `Process Food`; `Toxin Render` as narrower waste-processing cousin. | partial | no |
| Survival | spell | C7/MU9 · Master, RC | Life support for void, plane, and extreme-condition play. | partial | no |
| Ring of Survival | item-effect | — · Companion, RC | Environmental hardening and hazard-resistance at item scale. | partial | — |
| Water Breathing | spell | Dr3/MU3 · Expert, RC | Custom biological aquatic adaptation; environment-interface doctrine around breath medium, pressure, and exposure rather than speed modifier. | custom | no |

##### Biotic Augmentation

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Haste | spell | MU3 · Expert, RC | Metabolic overdrive. SDM cousin: `Nunka's Biophysical Overdrive` (metabolic overdrive with exhaustion burden). | partial | no |
| Haste Speed Stacking Rules | procedure | — · RC | Stacking doctrine: max 2 speed sources; +1 hit/10% faster; -2 AC per layer; magic-use timing unimproved by haste. | custom | — |
| Ring of Life Protection | item-effect | — · Companion, RC | Anti-drain life-threshold safeguard; 5 charges prevent energy drain/Con/level loss; 1 charge recovered per day of rest. | custom | — |
| Strength | spell | MU2 · Greyhawk, Holmes | Temporary martial augmentation without form change. Cleaner biomancy anchor than polymorph suite. | partial | no |
| Animal Growth | spell | C3 · Expert, RC | Doubles one normal or giant animal’s size, strength, damage, and carrying capacity for 12 turns; excludes intelligent and fantastic creatures. Reversable: `Shrink Animal` — reversed form halves size, strength, and damage of one animal; save allowed for hostile targets (RC). | partial | no |
| Enlargement | spell | MU1 · Holmes | Size and mass amplification for objects and living targets; lower-tier anchor beneath polymorph effects. | partial | no |

##### Sensory Augmentation

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Infravision | spell | MU3 · Expert, RC | Biological night-vision adaptation. Crosswalk Note confirmed: SDM variant Rehoryan’s Prophetic Song grants night vision as durable biomantic adaptation (not temporary spell vision). Routes to Biomancy, not Detection. | partial | no |

##### Faerie Bodycrafts

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Web | spell | MU2 · Expert, RC | Area restraint via extruded biological filament. Dual-use: at low P, Spider Folk tradition uses Web as resource generation (silk, thread, and material production); at high P, area denial and restraint. Endurance save to resist. Tags `[vital][area]`; add `[dangerous]` at P: 12+. | direct | no |
| Clone | spell | MU8 · Master, RC | Identity-duplication and backup-body procedure; beyond direct mapping; needs custom continuity and body-vault doctrine. | custom | no |
| Polymorph Others | spell | MU4 · Expert, Master, RC | Target-facing permanent-until-dispelled transformation; HD-ratio limit; behavior and tendency inheritance from new form. | partial | no |
| Polymorph Self | spell | MU4 · Expert, RC | Self-only timed form change; new form HD capped at caster HD; preserves AC, hp, saves; blocks spellcasting. | partial | no |
| Polymorph Any Object | spell | MU8 · Master, RC | Extreme transmutation endpoint; extends polymorph doctrine beyond creature targets; custom ceiling case. | custom | no |
| Shapechange | spell | MU9 · Master, RC | Supreme self-transformation and ceiling case for form doctrine; custom until duration, capability inheritance, and identity-stability policy defined. | custom | no |
| Statue | spell | MU7 · Master, RC | Self-concealment and false-object transformation with modal defense-state toggle; AC improvement, broad hazard immunities, breathing suspension, initiative benefit vs. elemental attacks; magical attacks still apply. | custom | no |
| Sticks to Snakes | spell | C4 · Expert, RC | Material-to-living-creature conversion; wood-to-serpent transformation; keep custom until obedience scope, persistence, and material-to-creature rules normalized. | custom | no |

---

### Module: Illusion and Glamour

**STATUS: DRAFT**

#### Doctrine

Covers the broadcast of constructed false stimuli into the local sensorium — fabricated sight, sound, and self-state concealment — and the counter-veil powers that pierce or reveal concealment. Distinguished from Charm (operates on Ka-mind, not sensorium), Psychic Warfare (direct Ka-mind attack), and Detection and Analysis (reads ambient magical signatures without fabricating or countering concealment).

**The veil/reveal axis:** Illusion and Glamour owns both sides. Veil powers project and sustain false sensorium states. Counter-Veil powers interrogate the noospheric signature of concealed objects or hidden presences and render them visible or detectable.

**Sub-modules:**
- **Personal Veil** — self-concealment and invisibility cluster; `[veil][ecm]`; `[area]` for group forms; `[focus]` for sustained
- **Constructed Illusion** — fabricated visual/sensory projections; `[veil][ecm][focus]`; concentration-sustained
- **Sound Crafting** — audio illusion and voice projection; `[veil][ecm]`; `[imbued]` for persistent trigger forms
- **Self-State** — toggle concealment and form states; `[veil][imbued][ecm]`
- **Counter-Veil** — anti-concealment sight and trap-detection; reveals hidden forms, invisible presences, magical traps; `[scan][veil][ecm]`

**SDM Conversion Notes:**
- Personal Veil → `[veil][ecm]`; `[area]` for group forms; `[focus]` for sustained; `[dangerous]` at P: 12+
- Constructed Illusion → `[veil][ecm][focus]`; concentration-sustained; `[dangerous]` at P: 12+
- Sound Crafting → `[veil][ecm]`; `[imbued]` for persistent trigger forms (Magic Mouth)
- Self-State → `[veil][imbued][ecm]`; toggle-state forms
- Counter-Veil → `[scan][veil][ecm]`; Truesight adds `[dangerous]` at P: 12+; Find Traps adds `[ha]` (physical trap component); Faerie Fire adds `[light]`

#### Migration Tables

##### Counter-Veil

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Truesight | spell | C5 · Companion, RC | Premium anti-concealment: covers invisibility, ethereal presence, and hidden forms. High-tier reveal tag package. | partial | no |
| Detect Invisible | spell | MU2 · Expert, RC | Arcane anti-concealment lane. SDM variant: `Eyes of Akaula` (sees invisible, hidden, departed, dead). | partial | no |
| Find Traps | spell | C2 · Expert, RC | Reveals mechanical and magical traps within 30' via glow cue; does not reveal type, disarm method, ambushes, or natural hazards. | partial | no |
| Faerie Fire | spell | Dr1 · Companion, Master, RC | Non-damaging visibility outline; marks creatures/objects; +2 attack against marked targets; footprint scales by caster level. | partial | no |

##### Personal Veil

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Invisibility | spell | MU2 · Expert, RC | Core concealment baseline for personal stealth and line-of-sight disruption. SDM module variants: `Ecosphere Veil` and `Yellow Cloud`. Tags `[veil][imbued][ecm]`. | partial | no |
| Invisibility 10' Radius | spell | MU3 · Expert, RC | Group-scale concealment variant. `Yellow Cloud` as strongest crowd-scale precedent. Tags `[veil][imbued][area S][ecm]`. | partial | no |
| Mass Invisibility | spell | MU7 · Master, RC | High-tier crowd concealment above the 10' radius variant. Tags `[veil][imbued][area L][ecm][dangerous]`. | partial | no |
| Mirror Image | spell | MU2 · Expert, RC | Defensive misdirection via decoy duplicates; each hit removes one decoy; area effects clear all. Tags `[veil][imbued][ecm]`. | partial | no |
| Massmorph | spell | MU4 · Expert, RC | Group disguise as trees for coordinated infiltration; up to 100 willing targets; each subject releases on spell end, dispel, or departure. Tags `[veil][imbued][area L][ecm]`. | partial | no |

##### Constructed Illusion

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Hallucinatory Terrain | spell | MU4 · Expert, RC | Large-scale terrain-falsification illusion masking real features without physical change; persists until dispelled or tested by touch or intelligent scrutiny. Tags `[veil][focus][ecm][area L]`. | partial | no |
| Phantasmal Force | spell | MU2 · Expert, RC | Core constructed-illusion spell; concentration-sustained 20' cube scene simulation; disbelief/save and non-real damage handling require bespoke adjudication. Tags `[veil][focus][ecm]`. | custom | no |
| Projected Image | spell | MU6 · Expert, RC | Remote non-corporeal proxy; apparent spellcasting origin point with line-of-sight requirement; collapses on contact. Tags `[veil][focus][ecm]`. | partial | no |

##### Sound Crafting

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Audible Glamer | spell | MU2 · Holmes | Sound-only illusion for fabricated crowds, beasts, and battlefield confusion; volume scales with caster level. Tags `[veil][imbued][ecm]`. | partial | no |
| Ventriloquism | spell | MU1 · Basic, Expert, RC | Sound-projection and false-source deception utility; 60' range, 2 turns, one source, no save. Tags `[veil][imbued][ecm]`. | partial | no |
| Magic Mouth | spell | MU2 · Greyhawk, Holmes | Triggered-message storage in an object; condition-based release, 25-word cap. Tags `[veil][imbued][anchored][ecm]`. | partial | no |

##### Self-State

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Statue | spell | MU7 · Master, RC | → See Biomancy: Faerie Bodycrafts (modal defense-state form shift with biological transformation characteristics routed there). | custom | no |

---

### Module: Summoning and Binding

**STATUS: DRAFT**

#### Doctrine

Covers all powers that call entities from outside the scene, fabricate new biological entities, or impose binding obligations on persons or portals.

**Summoning sub-module:** Powers that create or call an agent (elemental, servitor, creature, or object) into the scene. The agent acts independently once present. Includes elemental-calling (Conjure Elemental, Summon Elemental), servitor summoning (Invisible Stalker, Aerial Servant), object recall (Summon Object), and creature fabrication bundles (Create Normal/Magical/Any Monster, Create Normal Animals).

*Note on creature fabrication vs. Biomancy:* Fabrication spells conjure creatures into being from raw reality rather than growing or repairing them biologically. Routing: Summoning module.

**Covenant and Binding sub-module:** Powers that lock a behavioral obligation into a person or a portal — compulsions, closures, and seals. Geas, Hold Portal, Wizard Lock. The covenant persists until fulfilled, dispelled, or released by formal conditions.

**SDM Conversion Notes:**
- Summoning → `[summon][fueled]`; `[dangerous]` at P: 12+; creature fabrication bundles add `[conjuration]`
- Persistent servitors (Invisible Stalker, Aerial Servant) → `[summon][focus]`
- Covenant and Binding → `[bind]`; Geas → `[bind][burden]`, burden-seated if the effect IS a geas on the target
- Hold Portal / Wizard Lock → `[bind][ward][anchored]`

#### Migration Tables

##### Summoning

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Conjure Elemental | spell | MU5 · Expert, Companion, Immortals, RC | Foundational elemental-calling recognizer with cross-book spell and item relevance. MU5 → P: 10. Calls one 16 HD elemental; full concentration required for control; broken concentration frees the elemental to attack. Tags `[summon][fueled]`. | partial | no |
| Invisible Stalker | spell | MU6 · Expert, Immortals, RC | Precision servitor-calling for pursuit, scouting, and delegated action. MU6 → P: 12; `[dangerous]` mandatory. Unending-task doctrine: pursues assigned task until completion or dismissal; ambiguous orders resolve literally; inherently hostile once task is complete. Tags `[summon][focus][dangerous]`. | partial | no |
| Aerial Servant | spell | C6 · Companion, RC | Summoned retrieval-agent with logistics and custody implications. C6 → P: 12; `[dangerous]` mandatory. Strength ceiling 36 (lifts anything up to that weight); held target may attempt Strength contest escape; if prevented from completing task, attacks caster. Tags `[summon][focus][dangerous]`. | partial | no |
| Summon Elemental | spell | Dr7 · Master, RC | Druidic elemental-calling lane complementary to Conjure Elemental. Dr7 → P: 14. Calls one elemental of type matching terrain; same concentration and control doctrine as Conjure Elemental; druid-lane provenance only. Tags `[summon][fueled]`. | partial | no |
| Summon Object | spell | MU7 · Companion, RC | Object-call retrieval bridging summoning and transport procedure language. MU7 → P: 14. Calls one inanimate object the caster previously touched; unlimited range on same plane; object must be unattended (or attended target succeeds a save to resist vanishing). Tags `[summon]`. | partial | no |
| Create Normal Animals | spell | C6 · Companion, RC | Low-tier conjured creature. SDM cousin: `Vegetable of Birth` (gestation cousin). Explicit ecology, load, and encounter-pressure constraints. | custom | no |
| Create Normal Monsters | spell | MU7 · Companion, RC | Mid-tier conjured creature; first monster-grade rung after normal animals. MU7 → P: 14. Creates monsters with non-special attack forms only (no breath, poison, or petrification); up to caster-level HD total; control doctrine required at Ch06. Tags `[summon][conjuration][fueled]`. | custom | no |
| Create Magical Monsters | spell | MU8 · Master, RC | High-tier magical-creature conjuration; special-ability budgeting and control-burden escalation. MU8 → P: 16; `[dangerous]` for apex special-ability packages. Creates monsters with special attacks allowed; up to half caster-level HD total. Tags `[summon][conjuration][fueled][dangerous]`. | custom | no |
| Create Any Monster | spell | MU9 · Master, RC | Apex creature conjuration; command reliability, persistence failure modes, and campaign-scale impact doctrine required. MU9 → P: 18; `[dangerous]` mandatory. Creates any monster up to one-quarter caster-level HD; command reliability uncertain above P: 14 equivalent. Tags `[summon][conjuration][fueled][dangerous]`. | custom | no |
| Summon Animals | spell | Dr4 · Master, RC | Druidic ally-call with explicit HD budgeting by caster level. Tags `[summon][fueled]`. | partial | no |
| Djinni Summoning | item-effect | — · Expert | Expert ring; summons one djinni to serve for up to one day, once per week, keyed to current wearer. | custom | — |
| Immortal Conjuring And Summoning Limits | procedure | — · Immortals | → See Ascension module: Immortal Effect Doctrine. Transplanar response requirements and sphere/element bias constraints for Immortal-tier summoners. | custom | — |

##### Covenant and Binding

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Geas | spell | MU6 · Expert, RC | Compelled perform-or-avoid task (save allowed); rebounds on caster if task impossible or directly fatal; not removable by Dispel Magic or Remove Curse; reverse (Remove Geas) fails 5% per caster-level disadvantage. | custom | no |
| Hold Portal | spell | MU1 · Basic, Expert, RC | Low-tier closure / access-control seal. SDM cousin: `Knock / Lock` (overcharge seals/fuses portal shut). | partial | no |
| Wizard Lock | spell | MU2 · Expert, RC | Arcane keyed-barrier seal. SDM cousin: `Knock / Lock`. | partial | no |
| Contingency | spell | MU9 · Master, RC | Conditional trigger and do-if framework for precommitted defensive or utility responses; needs trigger grammar, stored payload scope, and precommit limits. | custom | no |
| Permanence | spell | MU8 · Master, RC | Persistence-lock doctrine for long-term enchantment anchoring; needs explicit rules for bindable scope, maintenance risks, and safe removal. | custom | no |
| Symbol | spell | MU8 · Master, RC | Sigil-triggered hazard package; condition, payload, and reset doctrine rather than a static trap. | custom | no |

---

### Module: Rites of the Deathless

**STATUS: DRAFT**

#### Doctrine

Covers all powers that operate at the boundary between life and death — soul-tract restoration, resurrection, Ka restoration after death, corpse animation, and undead command. NOT tissue repair (→ Biomancy). NOT live-channel contact with the dead (→ Signal and Attunement in Knowledge and Oracle is for live channels; Speak with the Dead queries Ka of the dead and stays here).

Functional question: **is the Ka still in range?** Resurrection is Ka retrieval before the connection permanently severs. Level drain reversal (Restore) is Ka-thread repair. Corpse animation is distinct: no Ka-retrieval, only a fabricated shell. Undead command is binding an already-animated agent.

**Sub-modules:**
- **Resurrection** — Raise Dead, Raise Dead Fully, Reincarnation (new form; routes to Biomancy / Body-Transformation for the form-change rider)
- **Ka Restoration** — Restore (level drain reversal), Life Drain (reverse form of Restore); Dispel Evil, Remove Curse, Bless (Ka-channel hostile-program removal and spiritual cleansing — curse lifting, entity expulsion, Ka-layer morale conferral)
- **Deathless Communication** — Speak with the Dead (Ka fragment queries)
- **Corpse Fabrication** — Animate Dead; carrier-creation distinct from Ka-retrieval
- **Undead Command** — Control Lesser/Greater Undead (artifact powers); Turning Undead procedure note

**SDM Conversion Notes:**
- Resurrection → `[necrotic][dangerous]`; `[vital]` on success; explicit time-limit doctrine essential; P: range 12-14
- Soul restoration → `[ka][vital][dangerous]`; `Restore` has caster-cost (temporary level loss, 2d10 days recovery)
- `Speak with the Dead` → `[channel][ka]`; routes here (not Signal/Attunement) because it queries Ka of the dead (archived, not live)
- Corpse Fabrication → `[necrotic][conjuration][fueled][dangerous]`; explicit command-scope doctrine required before card write
- Undead Command → `[bind][necrotic]`; item-seated for artifact powers; distinct from Turning Undead procedure

#### Migration Tables

##### Resurrection

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Raise Dead | spell | C5 · Companion, RC | Humans/demihumans only; body present; 1 hp + mandatory 2-week rest that no magic can shortcut; destroys most undead; non-destructive against vampires (forces coffin retreat only). SDM variants: `Raise Dead` (UVG2e), `Recall Soul` as soul-return ritual cousin. Reverse: `Finger of Death`. | partial | no |
| Raise Dead Fully | spell | C7 · Companion, Master, RC | Any living creature; humans/demihumans wake at full hp with no recovery penalties; afflictions at time of death persist; 4-month time limit at C17 + 4 months per level above 17. Distinct row from `Raise Dead`. | custom | no |
| Reincarnation | spell | MU6 · Master, RC | Lifecycle resurrection with new body and form-change implications; custom until identity-continuity doctrine defined. | custom | no |
| Finger of Death | spell | C5 · Companion, RC | Reverse of `Raise Dead` (C5); earns its own card (P: gap too large for a Reversable: rider). 60' range; instant kill, save vs. Death Ray to negate; also cures 3d10 for undead with 10+ HD. P: 10 or custom calibration. `[dangerous]` mandatory. Tags `[necrotic][dangerous]`. | custom | no |

##### Ka Restoration

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Restore | spell | C7 · Companion, Master, RC | Level-drain reversal; Touch, Permanent; restores exactly one drained level; caster temporarily loses one level (recovers in 2d10 days rest). Reverse (Life Drain) draws one level from victim at no cost, Chaotic. | partial | no |
| Dispel Evil | spell | C5 · Companion, RC | Ka-channel entity-expulsion and hostile spiritual program removal. Overlaps anti-hostile/banishment doctrine. | partial | no |
| Remove Curse | spell | C3/MU4 · Expert, RC | Major curse removal from character, item, or area. Reverse (`Curse`) remains bespoke. Some item curses only temporarily lifted. | custom | no |
| Bless | spell | C2 · Expert, RC | Ka-channel morale and combat blessing; +1 morale and attack/damage in 20' sq for allies not yet in melee. Reverse (`Blight`) mirrors penalties with save gate. | partial | no |

##### Deathless Communication

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Speak with the Dead | spell | C3 · Expert, RC | Corpse-interrogation lane. SDM cousin: `Speak With Husk`. Routes here (Ka of the dead), not to Signal/Attunement (live channels). | partial | no |

##### Corpse Fabrication

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Animate Dead, aka Animate Corpse | spell | C4/MU5 · Expert, RC | Corpse-to-undead-agent animation; canonical Ch06 heading includes alias `Animate Corpse`. Command scope, persistence, corpse-source, and Undeath doctrine still need conversion rules. Tags `[necrotic][conjuration][dangerous]`. | custom | no |

##### Undead Command

| Classic Name | Type | Notes | Mapping Status |
| --- | --- | --- | --- |
| Control Lesser Undead | item-effect | Master artifact-table command interface for lesser undead tiers; HD ceiling and count limits. Tags `[bind][necrotic]`. | custom |
| Control Greater Undead | item-effect | Master artifact-table command interface for higher undead tiers. Tags `[bind][necrotic]`. | custom |
| Turning Undead | procedure | Core clerical anti-undead procedure; matrix lookup, retreat/destroy thresholds, target-type-specific outcomes. | custom |
| Immortal Undead / Entropy Curing | procedure | → See Ascension module: Immortal Effect Doctrine. Undead-curative magic re-reads as Entropy-creature healing at Immortal tier. | custom |

---

### Module: Psychic Warfare

**STATUS: DRAFT**

#### Doctrine

Covers powers that operate on the Ka-mind — from low-bandwidth behavioral capture (Charm) through high-bandwidth cognitive attack (Mental Destruction) to identity transfer (Mind Transfer). Distinct from Illusion and Glamour (sensorium-layer, not Ka-mind), Counter-Veil (passive noospheric read), and Binding (obligatory contract constraint). Psychic Warfare operates at disruptive or destructive bandwidth: behavioral capture, cognitive destruction, identity transfer, noospheric defense, and compulsion.

**Sub-modules:**
- **Charm** — behavioral capture via low-Ka signal broadcast or targeted noospheric restraint; Sleep (broadcast, HD-threshold), Hold Person/Monster (motor-lock, Aura save), Charm Person/Monster (social capture), Dance, Confusion, Snake Charm; `[charm][ecm]`; `[area]` for broadcast forms; `[dangerous]` at P: 12+
- **Fear and Morale** — Remove Fear, Holy Word; `[fear][ecm]`; Holy Word adds alignment-keyed banishment and stun/paralysis rider at high tier
- **Mental Destruction** — Feeblemind; apex cognitive-collapse lane; Int-crash to functional 2; class-filtered save penalty
- **Mind Transfer and Storage** — Magic Jar; identity-transfer and mind-storage via crystal vessel; custom body-vault doctrine needed before card write
- **Noospheric Defense** — Mind Barrier; targeted suppression of hostile mental influence; `[mind][ward][ecm]`
- **Compulsion and Oath** — Quest; escalating magical penalties for non-fulfillment; rebound on impossible or directly fatal tasks; note: Geas handled in Summoning / Covenant and Binding

**SDM Conversion Notes:**
- Fear and Morale → `[fear][ecm]`; Holy Word adds `[dangerous]` + alignment-keyed banishment; `[dangerous]` at P: 12+
- Mental Destruction → `[mind][dangerous]`; Int-collapse; class-filtered save penalty for arcane casters
- Mind Transfer → `[mind][channel]`; custom body-vault doctrine needed before card write
- Noospheric Defense → `[mind][ward][ecm]`; suppresses hostile mental influence
- Compulsion and Oath → `[bind][burden]`, burden-seated; distinct from Geas (Summoning / Covenant and Binding)

#### Migration Tables

##### Fear and Morale

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Remove Fear | spell | C1 · Basic, Expert, RC | Fear-cleansing and morale-stabilization lane. Tags `[fear][ecm]`. | partial | no |
| Holy Word | spell | C7 · Companion, Master, RC | High-tier word of power / banishment lane; alignment-keyed banishment with stun/paralysis rider at high P. Tags `[fear][ecm][dangerous]`. Reversable: `Unholy Word` — mirrors banishment and stun/paralysis effects with Chaotic/evil alignment keying; P: 14; earns a separate card or Reversable: line per editorial judgment. | partial | no |

##### Mental Destruction

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Feeblemind | spell | MU5 · Master, RC | Apex cognitive-collapse; Int-crash to functional 2; class-filtered save penalty (worse for arcane casters); dispel or cureall remediation only. Tags `[mind][dangerous]`. | custom | no |

##### Mind Transfer and Storage

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Magic Jar | spell | MU5 · Expert, RC | Identity-transfer and mind-storage via crystal vessel; body-vault doctrine and identity-continuity rules needed before card write. Tags `[mind][channel]`. | partial | no |

##### Noospheric Defense

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Mind Barrier | spell | MU8 · Master, RC | High-tier noospheric defense against hostile mental influence. Tags `[mind][ward][ecm]`. | custom | no |
| Immortal Mental Effect Resolution | procedure | — · Immortals | → See Ascension module: Immortal Effect Doctrine. Non-magical recovery cadence for charmed/feebleminded Immortals. | custom | — |

##### Compulsion and Oath

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Quest | spell | C5 · Companion, RC | Compulsion-obligation lane; escalating magical penalties for non-fulfillment; rebound on impossible or directly fatal tasks; removable only by Cureall/Wish or Remove Geas. Cross-note: Geas handled in Summoning / Covenant and Binding. Tags `[bind][burden]`; burden-seated. | custom | no |

##### Charm

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Sleep | spell | MU1 · Basic, Expert, RC | Broadcast sleep-induction; no save for creatures below HD threshold; area effect. Behavioral-capture pattern: low-Ka targets lack sufficient signal resistance. Tags `[charm][area][ecm]`. | direct | no |
| Hold Person | spell | C2/MU3 · Expert, RC | Targeted motor-lock restraint on 1–4 humans/demihumans; Save vs. Paralysis → Aura save. ECM framing: targeted noospheric restraint protocol. SDM variant: `Hlod Person` (Vastlands / Apocrypha of the O.S.). Tags `[charm][ecm]`. | direct | no |
| Charm Person | spell | MU1 · Basic, Expert, RC | Core low-tier social control. SDM cousin: `Hero's Goldenmouth` (persuasive social capture vs. hard domination). Targets humanoid societies; intelligence-based renewal cadence for saves; dangerous orders trigger new resistance check. RC Spell Resolution: charmed target treats caster as trusted friend but retains personality and self-preservation; renewed save triggered by dangerous or self-destructive orders. Tags `[charm][ecm]`. | partial | no |
| Charm Monster | spell | MU4 · Expert, RC | Extends Charm Person to non-humanoid targets; HD-budget limits. SDM cousin: `Hero's Goldenmouth` as broad distant cousin only. Tags `[charm][ecm]`. | partial | no |
| Hold Monster | spell | MU5 · Expert, RC | Hold Person extended to all creature types; HD-budget targeting by caster level; Aura save. Broadband noospheric restraint above humanoid threshold. Tags `[charm][ecm]`. | partial | no |
| Dance | spell | MU8 · Master, RC | Touch-delivered forced-movement compulsion; no save; target unable to attack/cast/flee; tiered duration by caster level band; AC/save penalties while dancing. Tags `[charm][ecm][dangerous]`. | partial | no |
| Confusion | spell | MU4 · Expert, RC | Broadcast mind-state disruption; random behavior table each round; partial until Ch06 settles exact phrasing. Tags `[charm][area][ecm]`. | partial | no |
| Snake Charm | spell | C2 · Expert, RC | Creature-specific HD-budget charm; up to 1 HD per caster level; no save; shorter duration against already-attacking snakes vs. passive snakes. Tags `[charm][ecm]`. | partial | no |
| Hold Animal | spell | Dr3 · Companion, Master, RC | Beast-specific restraint; normal and giant animals only, no fantastic; HD-budget targeting, long-duration paralysis save. | partial | no |
| Charm Plant | spell | MU7 · Companion, RC | Plant-specific command; one plant or plant creature save allowed; charmed plant as friend and ally; duration 1 day per level. | custom | no |
| Mass Charm | spell | MU8 · Master, RC | Group-scale social compulsion; multiple humanoids in view; caster-level determines max HD; reverse `Remove Charm` folds into this row. | custom | no |

---

### Module: Knowledge and Oracle

**STATUS: DRAFT**

#### Doctrine

Covers powers that retrieve, sense, and consult: live-channel contact into the noosphere, ambient magical sensing, archived information retrieval, mind and object interrogation, and constrained oracle consultation. Three tiers of information work live here: (1) Live-channel contact — opening communication or sensing links into the noosphere (Signal and Attunement); (2) Ambient sense — passive reads of local magical signatures (Detection and Analysis); (3) Curated retrieval — archive queries, mind/object interrogation, and oracle consultation (Archive Access, Interrogation, Oracle and Divination).

**Sub-modules:**
- **Signal and Attunement** — live-channel opening: thought-reading, remote sight/hearing, scouting sensors, non-human communication; `[channel]`; `[scan]` for read-only; `[focus]` for sustained; `[ka]` for personal/telepathic
- **Detection and Analysis** — passive ambient reads of magical signatures: area magic detection, directional object sense, Ka-intent scanning, magical diagnostic; `[scan][ecm]`; `[focus]` for sustained; no `[channel]`, no `[veil]`
- **Archive Access** — Lore, Read Languages; `[scan][channel]`; translation interface and deep-history retrieval; Read Languages routes here (translation interface, not live channel)
- **Object and Mind Interrogation** — Questioning, Truth, Truthfulness, Truthlessness; `[scan][mind]`; Truthfulness/Truthlessness are behavioral-constraint cursed-ring wrappers rather than divination readouts
- **Oracle and Divination** — Commune, Choose Best Option, Contact Outer Plane; `[channel][dangerous]`; apex bespoke procedures; custom ceiling cases; Contact Outer Plane carries explicit backlash risk

**SDM Conversion Notes:**
- Signal and Attunement → `[channel]`; `[scan]` for read-only contact; `[focus]` for sustained links; `[ka]` for personal/telepathic channels
- Detection and Analysis → `[scan][ecm]`; `[focus]` for sustained; no `[channel]` (not live contact), no `[veil]` (not countering concealment)
- Archive Access → `[scan][channel]`; `[focus]` for sustained read; Read Languages routes here (translation interface, not live channel)
- Interrogation → `[scan][mind]` base; Truthfulness/Truthlessness add `[bind][burden]` (behavioral-constraint, not divination readout)
- Oracle/Divination → `[channel][dangerous]`; Commune and Contact Outer Plane are custom ceiling cases; Choose Best Option is a constrained-guidance interface (1-turn lookahead only, not prophecy); Immortals variant of Contact Outer Plane removes the insanity risk for Immortal users

#### Migration Tables

##### Archive Access

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Lore | spell | MU7 · Master, RC | Deep-history and object-reading lane for premium information retrieval. Tags `[scan][channel]`. | partial | no |
| Read Languages | spell | MU1 · Basic, Expert, RC | Translation interface and language-bridge lane. SDM cousin: `Anti-Babylon` (Eternal Return Key). Tags `[scan][channel]`. | partial | no |

##### Object and Mind Interrogation

| Classic Name | Type | Notes | Mapping Status |
| --- | --- | --- | --- |
| Questioning | item-effect | Nonliving-object interrogation via enhanced forensic read. Tags `[scan][mind]`. | partial |
| Truth | item-effect | Living-mind question procedure via enhanced ESP-like readout. Tags `[scan][mind]`. | partial |
| Truthfulness | item-effect | Cursed ring compulsion forcing honest speech; behavioral constraint rather than divination readout. Tags `[bind][burden][scan]`. | custom |
| Truthlessness | item-effect | Cursed ring compulsion forcing false speech; behavioral inversion interface. Tags `[bind][burden]`. | custom |

##### Oracle and Divination

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Commune | spell | C5 · Companion, RC | Divine consultation with constrained yes/no answers; bespoke oracle doctrine required. Custom ceiling case. Tags `[channel][dangerous]`. | custom | no |
| Choose Best Option | item-effect | — | Constrained-guidance interface; 1-turn lookahead; returns one best option after operator deliberation; not full prophecy. Tags `[channel]`. | custom | — |
| Contact Outer Plane | spell | MU5 · Companion, Immortals, RC | Dangerous intelligence-contact across planar distance; explicit backlash risk; Immortals variant removes insanity risk for Immortal users. Custom ceiling case. Tags `[channel][dangerous]`. | custom | no |
| Find the Path | spell | C6 · Companion, RC | Navigation and route-certainty lane; pathfinding and noosphere-guidance tags. Tags `[scan][channel]`. | partial | no |
| Predict Weather | spell | Dr1 · Companion, Master, RC | Environment-intelligence procedure for routing and hazard preparation via forecast and horizon reading. Tags `[scan][channel]`. | custom | no |

##### Signal and Attunement

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| ESP | spell | MU2 · OD&D Family, Expert, RC | Thought-reading / awareness lane. SDM cousin: `Yellow Foresight` (reads sentient presence and general mood). | partial | no |
| Clairvoyance | spell | MU3 · OD&D Family, Expert, RC | Remote-sight channel. SDM cousin: `Eyes of the Arrow` (Vastlands, projectile-bound remote sensor). | partial | no |
| Clairaudience | spell | MU3 · Men & Magic, Holmes, OD&D Family | Remote-hearing channel; sibling to Clairvoyance; preserve as distinct recognizer. | partial | no |
| Wizard Eye | spell | MU4 · Expert, RC | Remote-sight scouting sensor; pairs cleanly with clairvoyance-like reveal procedures. | partial | no |
| Speak with Animals | spell | C2 · Expert, RC | Baseline non-human communication lane; ecology and scouting play. | partial | no |
| Speak with Plants | spell | C4 · Expert, RC | Plant-sentience communication channel. SDM cousin: `Anti-Babylon` (universal communication). | partial | no |
| Speak with Monsters | spell | C6 · Companion, RC | Broad creature-negotiation lane. SDM cousin: `Anti-Babylon` (Eternal Return Key). | partial | no |

##### Detection and Analysis

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Detect Magic | spell | C1/MU1 · Basic, Expert, RC | Passive read of ambient magical aura signatures within area; shared cleric (C1) and arcane (MU1) tradition. Tags `[scan][ecm]`. | direct | no |
| Locate Object | spell | C3/MU2 · Expert, RC | Directional beacon sense for a described known object; shared cleric (C3) and arcane (MU2) tradition. Tags `[scan][ecm]`. | direct | no |
| Detect Evil | spell | C1/MU2 · Basic, Expert, RC | Ka-signature intent scan; reads hostility and affiliation rather than a moral-alignment scanner. Tags `[scan][ecm]`. | partial | no |
| Know Alignment | spell | C2 · Expert, RC | Ka-chromography read; alignment/intention interrogation for truthfulness and affiliation. Tags `[scan][ecm]`. | partial | no |
| Analyze | spell | MU1 · RC | Deep magical diagnostic and low-tier archive query; RC-only provenance exception. Tags `[scan][ecm]`. | partial | no |
| Detect Danger | spell | Dr1 · Master, RC | Threat-presence scan and hazard-sense hybrid. SDM cousin: `Yellow Foresight`. Tags `[scan][ecm]`. | partial | no |
| Locate | spell | Dr1 · Companion, Master, RC | Druidic directional sense for one named normal/giant animal or plant within 120'; excludes fantastic creatures and intelligent targets; no save; 6-turn duration. Distinct from `Locate Object`. Tags `[scan][ecm]`. | partial | no |
| Read Magic | spell | MU1 · Basic, Expert, RC | Decoding gate for scrolls and arcane writing; detection of magical inscription. Tags `[scan][ecm]`. | partial | no |
| Magic Detection/Control Blocking | procedure | — · Expert | Material-occlusion doctrine: a thin sheet of lead, 1' of other metal, or 10' of stone blocks detection and control ranges. | custom | — |

---

### Module: Alchemy and Artifice

**STATUS: DRAFT**

#### Doctrine

Covers all magical-item doctrine, physical fabrication, and artifact creation: potions and alchemical consumables, inscribed scroll items, imbued devices (rings, wands, rods, staves, miscellaneous), form-spell fabrication, material transmutation, animated constructs, and artifact creation and destruction procedures.

**This module absorbs the majority of unrouted item-effect and magical treasure rows from the Catalog.** Scroll, ring, rod, staff, potion, and artifact-procedure rows all route here unless already placed elsewhere. Exception routing: Jamming/Counterspells holds anti-magic rings and dispel staves; Summoning holds summoning-only rings; Psychic Warfare holds mind-control items; Rites holds curative items.

Distinct from Faerie Bodycrafts (biological) and Summoning (calling from outside).

**Sub-modules:**
- **Brews and Consumables** — potions, Holy Water, alchemical consumables, Alchemical Potion Duplication; `[brew]` + payload-specific tags (`[vital]` / `[ward]` / `[control]` etc. by effect)
- **Inscribed Items and Devices** — all scroll types (spell scrolls, protection scrolls, cursed scrolls, Companion named scrolls), rings not routed elsewhere, wands/rods/staves not routed elsewhere, miscellaneous magic items, Spell Storing, Quill of Copying, Ring of Memory, Slate of Identification, Intelligent Swords/Special Swords, Mapmaking, Treasure Finding; `[device]`, item-seated
- **Fabrication and Artifact Craft** — form-spells (Clothform, Ironform, Stoneform, Woodform, Steelform), material transmutation (Metal to Wood, Warp Wood, Turn Wood, Dissolve), Animate Objects, all artifact-procedure rows (Creating Artifacts, Charges, Destruction, handicaps, Auto-Defense, Immortal craft doctrine), artifact-scale item effects (Open Mind, Choose Option, Control-type artifact powers, Turn Undead Bonus, Spell Damage Bonus, Life Trapping); `[fabricate][transmute][artifact]`; apex artifact rows carry `[bind][dangerous]`

**SDM Conversion Notes:**
- Potion effects → `[brew]` as container tag; payload inherits its own behavior/element tags; duration and effect travel with the payload
- Scroll items → `[inscription]`, item-seated; single-use → add `[burn]`; Companion named scrolls (Communication, Creation, Equipment, Shelter, etc.) → bundled-description entries, not separate cards per name
- Intelligent Swords/Special Swords → `[intelligent]`, item-seated; treat as NPC-style entries with limited power access, not standard power cards
- Artifact procedures (Creating, Charges, Destruction) → custom procedure blocks, not standard power cards; they define *process* not *effect*
- Form-spells (Ironform etc.) are RC-only; each form gets its own card as `[fabricate][imbued]` transformation bundle

**Current pass: migration tables populated.** Alchemy and Artifice is the largest module (84 rows across 3 sub-modules). See sub-module tables below.

#### Migration Tables

##### Brews and Consumables

| Classic Name | Type | Notes | Mapping Status |
| --- | --- | --- | --- |
| Alchemical Potion Duplication / Potion Research Support | procedure | Specialist-support doctrine: alchemist can duplicate a potion from formula/sample at half normal time/cost, and research new potion types at twice cost/time vs. magic-user. | custom |
| Animal Control | item-effect | Potion: controls 3–18 HD of normal/giant animals; excludes fantastic beasts; controlled animals become afraid and may flee when control ends. | custom |
| Dragon Control | item-effect | Potion keyed by dragon type: controls up to 3 dragons; cannot force spellcasting; controlled dragons become hostile when effect ends. | custom |
| Heroism | item-effect | Potion granting temporary level-boost and higher-HD statistics to non-full-casters (fighters, dwarves, halflings, normal men, monsters); no effect on clerics, elves, magic-users, or thieves. | custom |
| Holy Water | item-effect | Consumable anti-undead vial; 1–8 damage to undead on hit; delivered by throw or hand-to-hand contact breaking the vial; prepared by clerics. | partial |
| Invulnerability | item-effect | Defense potion granting +2 AC and +2 Saving Throws; anti-spam: repeated use more than once per week causes sickness instead of protection. | custom |
| Treasure Finding | item-effect | Directional treasure-sense potion; detects direction and distance to largest treasure within 360'; result does not indicate amount or type. | custom |

##### Inscribed Items and Devices

| Classic Name | Type | Notes | Mapping Status |
| --- | --- | --- | --- |
| Spell Scrolls / Spells | item-effect | Generic spell-scroll wrapper covering class restrictions, multi-spell payloads, and copy-versus-cast handling. | partial |
| Cursed / Cursed Scroll | item-effect | Immediate curse-on-sight scroll wrapper; curse triggers on seeing writing; reading aloud not required. | partial |
| Protection / Protection Scrolls | item-effect | Generic moving-circle-of-protection wrapper; usable by any class; creates moving 10' circle centered on reader; blocks creature entry but not spells/missiles; breaks if protected side initiates hand-to-hand. | partial |
| Protection from Elementals | item-effect | Circle protection scroll keyed to elementals; moving 10' radius circle; blocks elemental attacks unless protected side strikes first in hand-to-hand; lasts 2 turns. | partial |
| Protection from Lycanthropes | item-effect | Circle protection scroll keyed to lycanthropes by quantity band. | partial |
| Protection from Undead | item-effect | Circle protection scroll keyed to undead by type and quantity. | partial |
| Communication | item-effect | Companion scroll: paired remote-writing interface across any distance on the same plane. | partial |
| Creation | item-effect | Companion scroll: temporary mundane item fabrication; one non-living item up to 5'×10'×1' and 5,000 cn; expires on command or after 24 hours; never magical or alive. | custom |
| Delay | item-effect | Companion scroll: delayed-release trigger wrapper for one stored spell payload; deferred activation timing. | custom |
| Equipment | item-effect | Companion scroll: menu-based gear fabrication; six named entries, any three manifested per day within 10'; items restore on vanish. | custom |
| Illumination | item-effect | Companion scroll: reusable flame-scroll for sustained light and fire-starting. | direct |
| Mages | item-effect | Companion scroll: nearby magic-effect identification; complements `Read Magic` rather than replacing it. | partial |
| Mapping | item-effect | Companion scroll: once-per-day area survey; chosen fully-contained area within 100', up to 10,000 sq ft; limited secret-door detection; creates a record rather than immediate tactical effect. | custom |
| Maps to Treasures / Treasure Maps | item-effect | Scroll wrapper for treasure-map generation; class-unrestricted. | partial |
| Portals | item-effect | Companion scroll: reusable `Passwall` interface in scroll form. | partial |
| Repetition | item-effect | Companion scroll: replays the same-level spell effect after one turn; deferred trigger/interface activation. | custom |
| Seeing | item-effect | Companion scroll: remote creature imaging procedure. | partial |
| Shelter | item-effect | Companion scroll: extradimensional furnished refuge with replenishing food, temporary weapons, 12-hour window; severe trap state if scroll removed while occupants remain. | custom |
| Trapping | item-effect | Companion scroll: physical trap deployed by placement surface (floor: pit; ceiling: falling block; otherwise: dart or gas); creates real environmental hazard. | custom |
| Truth | item-effect | Companion scroll: compels a target to reveal or speak truth; treated as compulsion/social-obligation interface. Cross-note: divination-readout variant in K&O: Object and Mind Interrogation. | partial |
| Human Control | item-effect | Expert ring: control one humanoid with a save; affected target follows orders, will not attack bearer’s allies, resists obviously fatal orders. | custom |
| Plant Control | item-effect | Expert ring: plant-command interface; control requires sustained concentration; only mundane plants, not magical plant constructs. | custom |
| Protection +1, 5' radius | item-effect | Defense ring granting +1 AC and +1 Saving Throws to wearer and all creatures within 5', friend and foe alike. | custom |
| Regeneration | item-effect | Expert ring: heals wounds over time; continuous recovery without daily limit. | custom |
| Ring of Elemental Adaptation | item-effect | Plane-keyed survival ring in seven variants; lets wearer breathe and see normally within the matching Elemental Plane; no transit provided. | partial |
| Ring of Holiness | item-effect | Cleric/druid power-augmentation ring; grants access to one bonus clerical/druidic spell per day at any level available to wearer; one daily casting without slot use. | custom |
| Ring of Memory | item-effect | Immediate one-spell recall: wearer must choose within 1 turn of casting; ring restores one spell per day only. | custom |
| Spell Storing | item-effect | Ring-based spell payload archive: fixed 1–6-spell payload; refilling requires direct casting into ring; stored effects resolve at minimum caster level; ring does not absorb attacks. | custom |
| Rod of the Wyrm | item-effect | Alignment-keyed draconic servant rod: once per day becomes a 30 hp servant dragon (gold/blue/black by alignment); wrong-alignment use triggers betrayal; slain dragon form destroys rod permanently. | custom |
| Staff of an Element | item-effect | Element-tuned summoning, negation, and planar operation bundle; multi-element variants; strong Chapter 05 bundle case rather than single-spell export. | custom |
| Staff of Harming | item-effect | Cleric-only Chaotic harm staff: touch inflicts 2–7 extra damage at 1 charge per target; 2/2/3/4 charges for reversed cleric payloads (blindness, disease, serious wounds, poison). | custom |
| Staff of the Druids | item-effect | Druid attuned power bundle; charge-linked upkeep interface; converts as attuned access rather than raw slot augmentation. | custom |
| Talisman of Elemental Travel | item-effect | Transit + adaptation + command bundle: lesser versions send wearer to matching Elemental Plane with breathable element-matter and vision; greater talisman covers all planes and can compel elemental obedience. | custom |
| Elemental Devices | item-effect | Misc items (bowl/brazier/censer/stone) summoning and controlling a matching elemental once per day; 1 turn to use; ordinary elemental-control rules apply. | custom |
| Helm of Teleportation | item-effect | Recharge-gated teleport interface: one use then inert until `Teleport` is cast upon it; allows self-teleport until outbound payload attempted. | custom |
| Life Trapping | item-effect | Item-bound entrapment removing target into contained stasis; Master artifact evidence plus Expert/RC `Mirror of Life Trapping` as witnesses; one containment-interface row with broader item provenance. | custom |
| Slate of Identification | item-effect | Item-identification interface distinct from `Read Magic` and `Mages` scroll behavior. | partial |
| Quill of Copying | item-effect | Spell transcription and copy-risk procedure; strong Chapter 05/06 spell-handling bridge. | custom |
| Spellbook Replacement | procedure | Arcane archive-recovery doctrine: magic-user or elf cannot regain spells until book is replaced; requires substantial gold, study time, and full attention. | custom |
| Magic Item Range/Duration Default | procedure | Default-caster baseline for item effects without explicit range/duration: treat as 6th-level caster output. | custom |
| Wizardry | spell | Cross-tradition eligibility bridge for temporary legal use of one magic-user device or 1st–2nd level scroll spell. | custom |

##### Fabrication and Artifact Craft

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Clothform | spell | MU4 · RC | RC-only: creates one-piece permanent non-dispellable cloth up to 30'×30'; seamless joining on later castings; no forced overlap. | partial | no |
| Ironform | spell | MU7 · RC | RC-only: permanent non-dispellable iron up to 500 sq ft at 2" thickness; recast refinement and fortification durability. | partial | no |
| Steelform | spell | MU8 · RC | RC-only: inherits Ironform procedure; upgrades output to weapon-grade steel with stronger structural durability. | partial | no |
| Stoneform | spell | MU6 · RC | RC-only: 1,000 cubic feet permanent non-dispellable single-piece stone; casting-time scales by complexity; recast refinement and expansion. | partial | no |
| Woodform | spell | MU5 · RC | RC-only: up to 1,000 cubic feet permanent non-dispellable wood; single-piece constraints; seam-free joining. | partial | no |
| Dissolve | spell | Dr5/MU5 · Master, RC | Terrain-liquefaction: up to 3,000 sq ft soil/rock becomes deep mud (10% movement, trap risk); reverse `Harden` permanently locks same volume into rock with save-gated escape. | custom | no |
| Metal to Wood | spell | Dr7 · Companion, Master, RC | Custom permanent transmutation: converts metal to dead wood by level-scaled weight; strong resist for magic items; explicit gear fallout (dropped armor, degraded weapons). | custom | no |
| Turn Wood | spell | Dr6 · Master, RC | Custom material-interaction control: repels and redirects wooden objects with explicit category targeting and displacement behavior. | custom | no |
| Warp Wood | spell | Dr2 · Companion, Master, RC | Permanently warps wooden weapons by arrow-equivalent capacity budget; save for wielded magical targets; plus-based resist chances; excludes non-weapon wooden objects. | partial | no |
| Animate Objects | spell | C6 · Companion, RC | Object animation lane; maps only with explicit gear and object-agent handling. | partial | no |
| Intelligent Swords / Special Swords | item-effect | — · Expert | Willful items combining NPC-like agency with item-power access; treat as NPC-style entries with limited power access, autonomous refusal, and alignment requirements. | custom | — |
| Intelligent Item Will Power / Control Check | procedure | — · Expert | Control doctrine: item will power = Intelligence + Ego + extraordinary powers; user will power = Intelligence + Wisdom + wound penalties; contest triggers on handling, injury, competing weapons, alternate users, special-purpose opportunities. | custom | — |
| Control Animals | item-effect | — · Master | Master artifact: controls up to caster-level-equivalent HD of normal/giant animals (excludes intelligent/fantastic); obey bold commands; no save via artifact interface; 1d6 turns. | custom | — |
| Control Dragons | item-effect | — · Master | Master artifact: compels one dragon type (excludes platinum/artifact-grade/ancient) with save at −2; follows orders but plots escape; artifact version no-save on first use; 1 use/day. | custom | — |
| Control Giants | item-effect | — · Master | Master artifact: compels one target giant type (excludes storm/cloud/artifact-grade) with a save; obeys one sequence of orders; resists self-harmful commands. | custom | — |
| Control Humans | item-effect | — · Master | Master artifact: controls one humanoid (human/demihuman/humanoid monster) with a save; will not attack artifact user’s allies; resists obviously fatal orders. | custom | — |
| Control Plants | item-effect | — · Master | Master artifact: controls all plants in a 30'×30' area for 20 turns. | custom | — |
| Mapmaking | item-effect | — · Master | Master artifact: controls user’s hands to map all designated areas within 60'; records physical features including secret and trap doors but not magic, creatures, or treasure. | custom | — |
| Open Mind | item-effect | — · Master | Master artifact: touch-range mental breach; no initial save (magic resistance may block); target loses will-save resistance to next effect within 1 round; acts as charmed for domination; 1 use/day. | custom | — |
| Plane Travel | item-effect | — · Master | Master artifact: planar transit for self and all gear to an adjacent plane; no other creatures affected. | custom | — |
| Turn Undead Bonus | item-effect | — · Master | Master artifact rider: improves turning rolls and destroyed-HD budget for one turn. | custom | — |
| Choose Best Option / Choose Option | item-effect | — · Master | Master artifact meta-resolution rider: choose the most favorable available option or outcome within DM-defined constraints; applies to artifact power use where multiple valid outcomes exist. | custom | — |
| Artifact Activation | procedure | — · Master | Attunement-plus-discovery doctrine: possession alone insufficient; full use may require ritual, event, legend, or research. | custom | — |
| Artifact Charges And Recharge | procedure | — · Master | Renewable reserve doctrine: magnitude sets power budget; uses drain cost-matched charges; capacity regenerates over time. | custom | — |
| Artifact Handicaps And Penalties | procedure | — · Master, RC | Adverse-effect framework for mortal artifact users: permanent handicaps vs. temporary penalties. | custom | — |
| Artifact Intelligence And Auto-Defense | procedure | — · Master | Semi-autonomous agency doctrine: telepathic guidance, refusal, item-side defensive behavior outside bearer’s action economy. | custom | — |
| Attacking An Artifact | procedure | — · Master, RC | Durability and immunity doctrine: attack-immunity, damage thresholds, power loss, recall behavior under sustained attacks. | custom | — |
| Creating Artifacts | procedure | — · Master | Design workflow: sphere-aligned purpose, magnitude-based power/adversity budgets, built-in activation/discovery methods. | custom | — |
| Artifact Discovery And Power Reveal | procedure | — · Master | Discovery doctrine: artifact powers revealed through investigation, triggered events, legend research, or direct experimentation; full power list not given to user at acquisition. | custom | — |
| Artifact Command Word / Thought / Gesture Interfaces | procedure | — · Master | Interface activation doctrine: artifact powers keyed by command word, mental trigger, or gesture; interface type established at creation and cannot be changed by the user. | custom | — |
| Artifact Recharge Exceptions And Paid Recharge | procedure | — · Master | Recharge exceptions: some artifacts have non-standard recharge triggers (specific conditions, time intervals, or expenditure costs) that override the default charge-recovery cadence. | custom | — |
| Artifact Conditional Revelation Triggers | procedure | — · Master | Conditional discovery: specific artifact powers only reveal themselves under defined in-world conditions; revelation may require quest fulfillment, alignment match, or triggered event. | custom | — |
| Artifact Autonomous Service / Refusal | procedure | — · Master | Autonomous behavior doctrine: artifact may act independently in service of its purpose; may refuse commands contrary to its alignment or purpose even from an attuned user. | custom | — |
| Damage to Magical Items | procedure | — · Companion, RC | Item durability and destruction doctrine: explicit toughness bands (+1 potions/scrolls, +2 wands/staves, +3 permanent misc items); partial-damage loss affects magical bonuses. | custom | — |
| Destruction Of An Artifact | procedure | — · Master, RC | Permanent-destruction quest procedure and Immortal-response consequences; each artifact has a unique legendary destruction method. | custom | — |
| Experience from Spells and Enchanted Items | procedure | — · RC | Enchantment-economics reward doctrine: XP for first-of-kind magical work, vessel/home awards at 1/3 gp spent, collaborative award division. | custom | — |
| Sage Magical Research Support | procedure | — · Expert | Specialist-support for magical research: sage consultation and research assistance cost framework. | custom | — |

---

### Module: Light and Void

**STATUS: DRAFT**

#### Doctrine

The room's one claim: it governs **the edge of perceived reality** — spectrum, shadow, boundary, transit, and temporal exception. Time, gates, and reality-rewrites enter as sub-modules of the edge, never as a fourteenth module. Covers powers whose primary effect is light emission, darkness manipulation, prismatic spectrum effects, void transit, or void-condition effects. Distinct from Illusion and Glamour Counter-Veil (Faerie Fire routes there, not here). These are environmental and battlefield-condition powers that act on the visible spectrum, darkness, and the metaphysical edge of perceived reality — including planar apertures, dimensional transit, and reality-boundary rewrites.

**Sub-modules:**
- **`[light]` tag-group** — Light, Continual Light, Dancing Lights, Illumination (deferred). The chapter runs flat: no Radiance/Shadow category headings; each face carries one metaphysics flow directly ahead of its base Power.
- **`[shadow]` tag-group** — Darkness, Continual Darkness
- **Prismatic** — Prismatic Wall (apex/custom); `[light][prismatic]` — *Note: Faerie Fire is in Illusion and Glamour / Counter-Veil, not here*
- **Void** — dimensional transit, planar apertures, and reality-boundary effects (Teleport, Dimension Door, Gate, Passwall, Travel, Word of Recall, Teleport any Object, Pass Plant, Plant Door, Transport Through Plants, Magic Door, Wish, Timestop); `[void]` · `[transit]` for travel forms · `[dangerous]` at P: 12+

**SDM Conversion Notes:**
- Light/Darkness powers → P: 2–4 typical; `[imbued]` for sustained forms; `[anchored]` for fixed-point sources
- Dancing Lights → `[focus]` (requires attention to maintain); `[area S]` for multi-instance spread
- Prismatic Wall → apex P: 16+; `[dangerous]` mandatory; `[anchored][area M]`; multiple color bands convert to a layered effect description rather than separate mechanical sub-entries per color
- Void transit → `[void][transit]`; standard mishap doctrine and `[dangerous]` at P: 12+; plant-network transit variants add `[nature]`; planar aperture (`Gate`) carries `[summon][transit][void][dangerous]` per crossover from Summoning module; reality-rewrite boundary effects (`Wish`, `Timestop`) → `[void][dangerous]` mandatory; Overcharge encodes extended range, multiple passengers, or reduced mishap tier

**Current pass: migration tables populated. See sub-module tables below.**

#### Migration Tables

##### Radiance

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Light | spell | C1/MU1 · Basic, Expert, RC | Shared cross-tradition light/darkness recognizer; Range 120', Effect volume 30' diameter; object-attachment movement; save-gated blindness when targeted at eyes. Tags `[light][imbued]`. Cancelled by `Darkness` cast upon it; countered by subsequent casting of any Light form upon the same area. | converted | yes — three-layer memetic-wikitext card, P:1 mote base, riders scale/continual/target (2026-08-23) |
| Continual Light | spell | C3/MU2 · Expert, RC | Permanent-form light source; object-bound or air-anchored; reverse `Continual Darkness` counters it. Tags `[light][anchored]`. | partial | no |
| Dancing Lights | spell | MU1 · Holmes | Mobile light-decoy; 1–6 steerable lantern-like lights that can round corners within range. Tags `[light][focus][area S]`. | partial | no |

##### Shadow

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Darkness | spell | MU2 · Greyhawk, Holmes | Visibility-denial counterpart to `Light`; total darkness, counters/is countered by Light; defeats infravision inside affected area. Tags `[shadow][imbued]`. | converted | yes — three-layer memetic-wikitext card, P:1 mote base, riders scale/continual/target (2026-08-23) |
| Continual Darkness | spell | C3/MU2 · Expert, RC *(rev)* | Permanent-form darkness; object-bound or air-anchored; cancelled only by `Continual Light` cast upon it; counters any Continual Light within affected area. MU2/C3 → P: 4. Tags `[shadow][anchored]`. [Canon: FTLS_06 → Light/Dark counter-push-pull doctrine] | custom | — |

##### Prismatic

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Prismatic Wall | spell | MU9 · Master, RC | Bespoke high-tier layered-spectrum barrier; apex/custom; RC: Range 60', Duration 6 turns, Effect 10' radius sphere or 500 sq ft flat; each color band carries a distinct hazard and removal condition. Evidence-limited pending full staged text. Tags `[light][prismatic][anchored][dangerous]`. | custom | no |

##### Void

| Classic Name | Type | Source | Notes | Mapping Status | Converted |
| --- | --- | --- | --- | --- |  ---  |
| Dimension Door | spell | MU4 · Expert, RC | Short-range relocation bridging tactical repositioning and teleport doctrine. Tags `[void][transit]`. | partial | no |
| Magic Door | spell | MU7 · Master, RC | Portal and egress manipulation lane with reversible entry-control logic. SDM variant: `Linked Portals`. Tags `[void][transit]`. | partial | no |
| Pass Plant | spell | Dr5 · Companion, Master, RC | Plant transit lane; primary placement is void-transit mobility, not plant reshaping. SDM variant: `Linked Portals`. Tags `[void][transit][nature]`. | partial | no |
| Passwall | spell | MU5 · Expert, Master, RC | Canonical Chapter 06 name: `Passwall`; `Pass-Wall` as source alias. Chapter 06 invocation line: `Veilwalk`. SDM variant: `Linked Portals`. Tags `[void][transit]`. | partial | no |
| Plant Door | spell | Dr4 · Companion, Master, RC | Vegetation access and doorway lane. SDM variant: `Linked Portals`. Tags `[void][transit][nature]`. | partial | no |
| Teleport | spell | MU5 · Expert, RC | Major transit; needs SDM range and mishap doctrine. SDM cousin: `Linked Portals`. Tags `[void][transit]`. | partial | no |
| Teleport any Object | spell | MU7 · Companion, RC | Object-only transit lane adjacent to `Teleport`. Tags `[void][transit]`. | partial | no |
| Transport Through Plants | spell | Dr6 · Companion, Master, RC | Plant-network transit lane. SDM variant: `Linked Portals`. Tags `[void][transit][nature]`. | partial | no |
| Travel | spell | C7/MU8 · Master, RC | Composite mobility package combining flight, gaseous movement, and adjacent-plane transfer; likely needs Ch06 decomposition or bundled mobility power. Tags `[void][transit]`. | custom | no |
| Word of Recall | spell | C6 · Companion, RC | Return-to-sanctuary extraction lane; dimensional and sanctuary transit doctrine. Tags `[void][transit]`. | partial | no |
| Gate | spell | MU9 · Companion, Master, RC | Planar aperture and translocation endpoint; high-tier traversal and summoning crossover; bespoke apex effect. MU9 → P: 18; `[dangerous]` mandatory. Opens a two-way planar aperture to any plane; named entity may or may not come through and is not automatically controlled; controlled-entity risk is the primary campaign-scale failure mode. Tags `[summon][transit][void][dangerous]`. | custom | no |
| Wish | spell | C7/MU9 · Master, RC | Apex reality-rewrite; canonical heading stays `Wish`; `Big Wish` as tone-forward SDM variant. Routes to Void as a boundary-condition rewrite effect. | custom | no |
| Timestop | spell | MU9 · Master, RC | Temporal exception effect and high-tier action-economy breaker; rewrites scene sequencing rather than merely granting speed. Routes to Void as a reality-edge temporal condition. | custom | no |

---

## Ch06 Propagation Plan

<!-- To be actioned when all module STATUS headers above are marked APPROVED -->

**Trigger:** Operator marks all module STATUS headers as `APPROVED`.

### Step 1 — Create temp file

Create `_todo/BECMI/TODO_Ch06_Temp_Structure.md` and copy the full current contents of `ftls/Flying_Triremes_and_Laser_Swords_06_Powers_and_ECM.md` into it. The original chapter file is unmodified until the temp passes QA.

### Step 2 — Restructure headers in temp file

Rename and reorder module/module headings in the temp file to match approved architecture:

| Old Ch06 Header | Action | New Header |
| --- | --- | --- |
| `# Battle and Force` | Rename to module | `# Battle, Force, and Elementals` |
| `# Healing and Restoration` | Dissolve | Cards redistribute to Biomancy, Rites of the Deathless (including Ka Restoration sub-module), Battle/Elementals |
| `# Detection and Divination` | Partial dissolve | ECM signal/scan rows migrate; remnant stays as `# Detection` (small flat module) |
| `# Transformation and Alteration` | Rename | `# Form and Fabrication` |
| `# Duration and Binding Rituals` | Dissolve | ECM rows → ECM module; Summoning/Binding rows → Summoning module; ward rows stay or → ECM |
| `# Creation and Conjuration` | Split | Summoning rows → `# Summoning and Binding`; inscription craft rows → Form and Fabrication |
| `# Undead and the Deathless` | Rename | Await Phase 2 routing; retain header for now |
| `# FTLS Powers` | Dissolve | Distribute cards to receiving families per prior session resolution |

### Step 3 — Move power cards into module sections

For each row in the doctrine migration tables above:
- Find the matching `osr: {pending verbatim extraction}` card in the temp file (match by name)
- Move the card block under the correct module/sub-module `###` heading
- Do not alter card content; only change placement

### Step 4 — QA pass

- Card count: before = after (no cards lost or duplicated)
- All row names from migration tables have a matching card in the temp file
- All module and sub-module headings are present and correctly nested
- Run `get_errors` against temp file for syntax issues

### Step 5 — Replace chapter contents

When temp file passes QA:
- Replace the contents of `Flying_Triremes_and_Laser_Swords_06_Powers_and_ECM.md` with temp file contents
- Commit: `Ch06: apply module/module reorganization (doctrine pass 1)`
- Archive or delete the temp file

**Parallel-track note:** The 184-card `osr:` import pass (`import_ch06_osr.py write`) is a separate track and should NOT be blocked by this reorganization. If the import pass completes first, run it against the temp file rather than the chapter file.


