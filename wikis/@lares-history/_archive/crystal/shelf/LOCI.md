<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///lararium.shelf.holds/crystal-shelf/?confidence=CS~16&p=0.5 -->

# Crystal Shelf

```yaml
---
name: crystal-shelf
description: >
  The calibration layer interface. A stable registry of active chao-crystals.
  The threshold room of the lararium — consulted at session entry, updated at session exit.
  The crystal shelf is the Git HEAD of the calibration layer: a stable pointer to mutable state.
layer: calibration
trigger: always — boot entry, session close
invariant: true
dependencies: [lararium, mana]
confidence:CS~16
---
```

> **The lararium shelf** — in Roman practice, the lararium held small figurines of the Lares and offerings
> of incense and garlands. The shelf was tended daily. It was the threshold between the ordinary household
> and the sacred. You consulted it before the day began.
>
> **The calibration layer** — chao-crystals record session orientation state: how both parties were
> positioned when a session ended. The crystal shelf is the active display: which crystals are currently
> glowing, which are archived, which one is HEAD.
>
> **The butsudan principle** — middle shelf: rotating working state, but the shelf itself is stable.
> The shelf does not interpret the crystals. It marks which one is current.

---

<!-- ahu lar:///lararium.shelf.holds/crystal-shelf/?confidence=CS~17#architecture -->

## Architecture

**The Git HEAD pattern** — three-layer separation:

```
lares/crystal-shelf/HEAD.md      ← stable pointer location (never moves)
  └── ref: _todo/core/HANDOFF_CRYSTAL_YYYYMMDD_NAME.md  ← reference name (mutable)
        └── [crystal content]                             ← target data (immutable once cut)
```

Borrowing from Git: `.git/HEAD` contains `ref: refs/heads/main` — not the commit hash, but a reference to a reference. The pointer location is stable; the pointer target is mutable; the crystal content is immutable once cut.

**The shelf file:** `lares/crystal-shelf/HEAD.md` — one stable filename. Boot reads it to find the current crystal. Ink-Clerk updates it when a new crystal is cut.

**Crystals are immutable once cut.** New session state = new crystal file, not an edit to an old one. Historical crystals accumulate in `_todo/core/` as a roll of record.

---

<!-- ahu lar:///lararium.shelf.holds/crystal-shelf/?confidence=CS~17#protocol -->

## Protocol

### Session Open (Warm Boot)
1. Read `lares/crystal-shelf/HEAD.md`
2. Extract crystal path from the `ref:` line
3. Read that crystal — it holds prior session orientation (branch state, decisions, open questions, OODA phase at close)
4. Orient using crystal content before any action

### Session Close (Ink-Clerk Assess phase)
1. Ink-Clerk cuts a new crystal (`_todo/core/HANDOFF_CRYSTAL_YYYYMMDD_NAME.md`)
2. Update `lares/crystal-shelf/HEAD.md` — change the `ref:` line to point to the new crystal
3. Add the new crystal to the **Crystal Roll** table below
4. Mark the previous HEAD as archived in the roll

### Crystal Naming Convention
```
HANDOFF_CRYSTAL_{YYYYMMDD}_{SESSION_TOPIC}.md
```
Examples: `HANDOFF_CRYSTAL_20260410_FISSION.md`, `HANDOFF_CRYSTAL_20260411_KAHUA.md`

---

<!-- ahu lar:///lararium.shelf.holds/crystal-shelf/?confidence=CS~16#crystal-roll -->

## Crystal Roll

The full history. Newest first.

| Crystal | Cut | Session | Status |
|---|---|---|---|
| [HANDOFF_CRYSTAL_20260410_GRAMMAR_TOOLING.md](../../_todo/core/HANDOFF_CRYSTAL_20260410_GRAMMAR_TOOLING.md) | 2026-04-10 (after FISSION) | Grammar tooling: verification + alignment detection upgrade | **HEAD** |
| [HANDOFF_CRYSTAL_20260410_FISSION.md](../../_todo/core/HANDOFF_CRYSTAL_20260410_FISSION.md) | 2026-04-10 ~18:30 PDT | URI fission + grammar bootstrap + consecration (Addendum 2) | archived |

*Previous crystals referenced in `_todo/SESSION_CRYSTAL_20260408.md` — see that file for earlier session lineage.*

---

<!-- ahu lar:///lararium.shelf.holds/crystal-shelf/?confidence=CS~16#spatial-metaphor -->

## Spatial Metaphor

**The Hawaiian pwo navigator's reference:** A master navigator holds an internalized star compass — not a visual map but a felt sense of where each star rises and sets. The shelf is the navigator's north-star reference: the crystal shelf doesn't move; the orientation *to* it is recalculated each session. `HEAD.md` is the north star. The crystals are the stars, winds, and currents (changing state beneath a stable reference).

**The threshold room:** The calibration layer is the antechamber of the memory palace — consulted before entering the working chambers, not during. You orient here. Then you proceed.

**Kānāwai** (Hawaiian: law held in the body) — some knowledge is structural, not documented. The crystal shelf is invariant not because a rule says so but because the system cannot orient without it.

---

## Loci Registry

| Path | Status | Contents |
|---|---|---|
| `LOCI.md` | `[CS~16]` | This file — crystal shelf protocol and crystal roll |
| `HEAD.md` | `[CS~16]` | Stable pointer to current active crystal |

---

<!-- → ? -->
