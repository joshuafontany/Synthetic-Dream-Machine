~$ lares --context "BECMI -> SDM+ pipeline operating contract"

## Purpose

This file is an idempotent operator contract for the BECMI -> SDM+ pipeline.
It defines stable execution rules, routing, and invariants.
It does not store mutable runtime status, dated metrics, queue progress, or drift snapshots.

## Mutable State Boundary

All mutable state belongs in TODO and audit files, not here.

Use these as the live control surfaces:

- `_todo/BECMI/TODO_BECMI_Conversion.md` for active queue, active focus, and execution log.
- `_todo/BECMI/TODO_BECMI_Spell_Effect_Crosswalk.md` for import tracker state (`Ch06 Import`, `osr: imported`) and review queue.
- `_todo/BECMI/TODO_BECMI_Spell_Effect_Conversion_Doctrine.md` for doctrine decisions and mapping policy.

Audit reports have been archived to commit history and are no longer present as live files.

**When starting a new session, read `_todo/BECMI/TODO_BECMI_Conversion.md → ## Active Focus` first. That section identifies the on-fire item — the exact next action — before the general queue.**

If a line in this file requires a date, counter, status color, or "current blocker" wording, it belongs in a TODO or audit file instead.

## Project Frame

- Pipeline: BECMI -> SDM+ conversion for FTLS.
- Primary manuscript targets:
	- `ftls/Flying_Triremes_and_Laser_Swords_06_Powers_and_ECM.md`
	- `ftls/Flying_Triremes_and_Laser_Swords_05_Magitech_and_Fantascience.md`
- Chapter sequencing policy and active execution order are tracked in `_todo/BECMI/TODO_BECMI_Conversion.md`.

## Locked Formula

`P: = max(1, BECMI Spell Level x 2)`

Treat this as stable unless doctrine is explicitly revised in `_todo/BECMI/TODO_BECMI_Spell_Effect_Conversion_Doctrine.md`.

## Operator Loop (Targeted OSR Power)

When the operator targets one OSR power card, run this loop in order:

1. The operator targets an OSR power by exact FTLS card heading.
2. Find canonical exact-name matches in `Synthetic_Dream_Machine_04_Powers_Index.md` OR known canonical alias in FTLS  `meta:` block and record match/no-match.
3. If no exact match and no known alias exists, flag before body-text remap work; continue with `osr:` import only unless the operator confirms a new alias.
4. Run targeted `osr:` import for the selected card.
6. If canonical match or confirmed alias exists, update FTLS body text to the mapped SDM body path. Else skip.
7. Update FTLS `tags:` to the Doctrine file's guidelines, using Appendix Null as primary context, and the SDM Powers Index as secondary context.
8. If canonical match or confirmed alias exists, propagate corresponding tag changes from FTLS Powers to SDM Powers Index. Else skip.
9. Record operator-confirmed alias outcomes in the FTLS Power card's `meta:` block.

### Pseudo CLI Invocation

Use this pseudo invocation as the operator-facing trigger for the loop above:

```bash
~$ lares osr-power --target "<FTLS Power Card Name>" --apply
```

Pseudo semantics:
- `--target`: exact FTLS Chapter 06 power heading to process (for example `"Raise Dead"`).
- `--apply`: run the full loop in execution mode (not planning-only).

Optional pseudo switches:

- `--dry-run`: run the full loop in planning mode (no live script runs with changes).

```bash
~$ lares osr-power --target "<FTLS Power Card Name>" --dry-run
```

Semantics:
- `--dry-run`: report planned import/remap/tag deltas without editing files.
- `--target`: exact FTLS Chapter 06 power heading to process.
- `--apply`: execute the loop, not planning-only.

## Governance File Map

Stable references only:

- `_todo/BECMI/TODO_BECMI_Conversion.md`
- `_todo/BECMI/TODO_BECMI_Spell_Effect_Crosswalk.md`
- `_todo/BECMI/TODO_BECMI_Spell_Effect_Conversion_Doctrine.md`
- `_todo/BECMI/TODO_BECMI_Spell_Material_Staging.md`
- `_todo/BECMI/TODO_BECMI_Spell_Material_Staging_Basic.md`
- `_todo/BECMI/TODO_BECMI_Spell_Material_Staging_Expert.md`
- `_todo/BECMI/TODO_BECMI_Spell_Material_Staging_Companion.md`
- `_todo/BECMI/TODO_BECMI_Spell_Material_Staging_Master.md`
- `_todo/BECMI/TODO_BECMI_Spell_Material_Staging_Immortals.md`
- `_todo/BECMI/TODO_BECMI_Spell_Material_Staging_Rules_Cyclopedia.md`
- `_todo/BECMI/TODO_PRE_ADD_Spell_Staging.md`
- `_todo/ftls/TODO_FTLS_Chapter_Action_Plan.md`
- `_todo/ftls/TODO_Magitech_Fantascience_Chapter05.md`
- `_todo/ftls/TODO_Lares_Chapter05_Agent_Prompt.md`
- `_todo/AUDIT_REPORT_Doctrine_APPROVAL_2026-03-31.md`
- `_todo/AUDIT_REPORT_Confidence_Ratings.md`

## Maintenance Rule

Keep this file idempotent.

Allowed edits:

- workflow changes,
- policy changes,
- file-path routing changes,
- command-interface changes.

Disallowed edits:

- dated status updates,
- progress percentages,
- row counts,
- blocker snapshots,
- "current" queue items,
- runtime drift summaries.
