/**
 * `lares cleanup-days [N]` — read or explicitly set Claude Code's `cleanupPeriodDays`
 * in ~/.claude/settings.json: how many days a session file survives before Claude
 * deletes it at startup.
 *
 * Those session files (~/.claude/projects/…) ARE the mempalace's verbatim harvest
 * source, so a short window evaporates the raw memory before the ingest hook mines it.
 * `lares vessel stand --claude` sets the floor when absent (no-clobber); THIS command forces a
 * value — the explicit lever to raise an existing-but-low setting.
 *
 *   lares cleanup-days            show the current value (+ the floor)
 *   lares cleanup-days 99999      set it to 99999 (keep session files ~forever)
 *   lares cleanup-days max        alias for the floor (99999)
 *
 * Claude rejects 0 as invalid; the min is 1. A large finite number is the only
 * "keep forever" idiom — hence the floor.
 */

import {
  CLEANUP_PERIOD_DAYS_FLOOR,
  readClaudeCleanupPeriod,
  setClaudeCleanupPeriod,
} from "../claude-wire.js";
import { emit, exitFor } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

const CLAUDE_DEFAULT_DAYS = 30; // Claude's own default when the key is unset.

export async function cmdCleanupDays(args: ParsedArgs): Promise<number> {
  const raw = args.positional[0];

  // No argument → read-only surface (current value, the floor, whether it protects).
  if (raw === undefined) {
    const cur = readClaudeCleanupPeriod();
    const effective = cur ?? CLAUDE_DEFAULT_DAYS;
    const low = effective < CLEANUP_PERIOD_DAYS_FLOOR;
    emit(args, {
      ok: true,
      data: { cleanupPeriodDays: cur, effective, floor: CLEANUP_PERIOD_DAYS_FLOOR, protectedFromEvaporation: !low, source: cur === null ? "claude-default" : "settings.json" },
      human: () => {
        console.log("lares cleanup-days — Claude session-file retention (~/.claude/settings.json)");
        console.log(cur === null
          ? `  cleanupPeriodDays:  unset → Claude default ${CLAUDE_DEFAULT_DAYS} days`
          : `  cleanupPeriodDays:  ${cur} days`);
        console.log(`  floor (keep-~forever):  ${CLEANUP_PERIOD_DAYS_FLOOR}`);
        if (low) console.log(`  → session files (the mempalace harvest source) evaporate after ${effective} days.\n    Raise it:  lares cleanup-days max`);
        else console.log(`  → session files kept ~forever — the mempalace harvest source is protected.`);
      },
    });
    return 0;
  }

  // Argument → set explicitly (forces the value, even over an existing lower one).
  const days = raw === "max" ? CLEANUP_PERIOD_DAYS_FLOOR : Number(raw);
  if (!Number.isInteger(days) || days < 1) {
    const err = { code: "usage", message: `cleanup-days: expected a whole number ≥ 1 or "max", got "${raw}".`, hint: `Claude rejects 0; use \`lares cleanup-days max\` (${CLEANUP_PERIOD_DAYS_FLOOR}) to keep session files ~forever.` };
    emit(args, { ok: false, error: err, data: {}, human: () => { console.error(`lares cleanup-days: ${err.message}`); console.error(`  ${err.hint}`); } });
    return exitFor("usage");
  }

  try {
    const r = await setClaudeCleanupPeriod(days);
    emit(args, {
      ok: true,
      data: { cleanupPeriodDays: r.value, previous: r.previous, changed: r.changed, settingsPath: r.settingsPath },
      human: () => {
        console.log(r.changed
          ? `lares cleanup-days — set cleanupPeriodDays = ${r.value}${r.previous !== null ? ` (was ${r.previous})` : ""}`
          : `lares cleanup-days — already ${r.value}, nothing to do`);
        console.log(`  ${r.settingsPath}`);
        if (r.value >= CLEANUP_PERIOD_DAYS_FLOOR) console.log(`  → session files kept ~forever — the mempalace harvest source is protected.`);
        console.log(`  (takes effect at Claude's next startup — it cleans on boot)`);
      },
    });
    return 0;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    emit(args, { ok: false, error: { code: "error", message: msg }, data: {}, human: () => console.error(`lares cleanup-days: ${msg}`) });
    return exitFor("error");
  }
}
