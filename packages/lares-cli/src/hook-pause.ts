/**
 * hook-pause — the hook-lever: a marker file the capture + ingest hooks check and
 * NO-OP on when present, so a migration / teardown runs WITHOUT spawn-contention.
 *
 * The daemon-spawn whack-a-mole's root is the SPAWNER, not the children: the
 * `lares-mempalace-ingest-hook.sh` (and its `lares capture/subagents/telemetry`
 * legs) mint a warm write-daemon on every Stop / SessionEnd / subagent-dispatch.
 * Killing daemons never stops the minting. This lever pauses the minting itself —
 * the discipline made a switch: `lares hooks pause` writes the marker, the hook
 * script's guard exits early, `lares mempalace quiesce` can then drain to zero.
 *
 * The marker lives at `<state>/hooks.paused` (XDG state home, LAR_ROOT-aware) so
 * the same path resolves in TS (here) and in bash (the hook script computes it
 * from `${LAR_ROOT:+$LAR_ROOT/state}` else `${XDG_STATE_HOME:-$HOME/.local/state}/lares`).
 *
 * Meme: lar:///ha.ka.ba/lararium/mempalace/palace-path
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { larStateHome } from "@lararium/node";

/** The absolute path of the hook-pause marker — one spelling, TS + bash agree. */
export function hookPauseMarkerPath(): string {
  return join(larStateHome(), "hooks.paused");
}

/** True while the hooks are paused (the marker exists). */
export function hooksArePaused(): boolean {
  return existsSync(hookPauseMarkerPath());
}

export interface HookPauseState {
  readonly paused: boolean;
  readonly marker: string;
  /** When paused: the reason + ISO timestamp recorded in the marker (best-effort). */
  readonly since?:   string;
  readonly reason?:  string;
}

/** Read the current pause state, parsing the marker's recorded reason/timestamp. */
export function hookPauseState(): HookPauseState {
  const marker = hookPauseMarkerPath();
  if (!existsSync(marker)) return { paused: false, marker };
  let since: string | undefined;
  let reason: string | undefined;
  try {
    const body = JSON.parse(readFileSync(marker, "utf8")) as { since?: string; reason?: string };
    since  = body.since;
    reason = body.reason;
  } catch { /* a hand-touched / empty marker still means paused */ }
  return { paused: true, marker, ...(since ? { since } : {}), ...(reason ? { reason } : {}) };
}

/** Write the pause marker (idempotent — re-pausing refreshes the reason/timestamp). */
export function pauseHooks(reason = "manual"): HookPauseState {
  const marker = hookPauseMarkerPath();
  mkdirSync(dirname(marker), { recursive: true });
  const since = new Date().toISOString();
  writeFileSync(marker, JSON.stringify({ since, reason }) + "\n", "utf8");
  return { paused: true, marker, since, reason };
}

/** Remove the pause marker (idempotent — a clean no-op when already resumed). */
export function resumeHooks(): HookPauseState {
  const marker = hookPauseMarkerPath();
  rmSync(marker, { force: true });
  return { paused: false, marker };
}
