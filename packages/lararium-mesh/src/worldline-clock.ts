/**
 * worldline-clock — the FfzClock's first integration: per-worldline RHYTHMIC clocks
 * keyed on the lineage HANDLE (never the Automerge actor — agents hold none; the
 * daemon owns the sole replica). Pure functions over the existing typed structures;
 * the caller owns persistence (the LarDoc write path) and the live trigger.
 *
 * Design (grounded by the Horologe research spirit, 2026-06-25):
 *   - WHERE: the durable SessionEventLog is the source of truth; high-frequency
 *     live-tick may later ride ephemeral PresenceSlot (DEFERRED — not built here).
 *     Event-sourcing: persist the authoritative log, checkpoint at rollovers
 *     (Kurrent/Fowler). Ephemeral convention: cursor-like state never bloats the doc
 *     (Automerge ephemeral data · Yjs awareness).
 *   - WHEN: tick on the GROUNDING act (the operator's acknowledging next move —
 *     Pending→Moves), never on emission (Clark & Brennan 1991 · Ginzburg KoS ·
 *     A2A `input_required`). `lares yield … -> ?` IS the Pending state.
 *   - HOW: key on the handle, the ticking identity decoupled from the persisting
 *     replica (Almeida/Baquero, Interval Tree Clocks 2008).
 *   - MINIMAL: construct-on-first-event → grounding-tick → append; presence deferred.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/api/agent-worldline#time
 */

import { ffzZero, ffzTick, type FfzClock, type FfzLevel, type LarTickCounter } from "./ffz-clock.js";
import type { SessionEvent, SessionEventLog } from "./social-tiddlers.js";

/** L1 (Beat) — one grounded operator-agent exchange turn; the default tick level. */
export const BEAT_LEVEL = 1;

/**
 * The current clock for a handle — the latest event it ticked (by the node-monotonic
 * tickCounter), else a fresh zero KEYED ON THE HANDLE (construct-on-first-event).
 * Never keys on a replica actor: two worldlines on one daemon stay distinct here.
 */
export function worldlineClockFor(log: SessionEventLog, handle: string, bounds?: FfzLevel): FfzClock {
  let latest: SessionEvent | undefined;
  for (const ev of Object.values(log.events)) {
    if (ev.clock.actorId !== handle) continue;
    if (!latest || ev.tickCounter > latest.tickCounter) latest = ev;
  }
  return latest ? latest.clock : ffzZero(handle, bounds);
}

/** Advance one grounded turn (default L1 Beat). Carries rollover upward per ffzTick. */
export function groundingTick(clock: FfzClock, level = BEAT_LEVEL): FfzClock {
  return ffzTick(clock, level);
}

/**
 * A checkpoint boundary — a level at or above Measure (L2) rolled over. These are the
 * natural points to persist into the durable log; finer Pulse/Beat ticks may ride
 * ephemeral presence later (Horologe Q1). L0/L1-only advances return false.
 */
export function isCheckpoint(prev: FfzClock, next: FfzClock): boolean {
  for (let i = 2; i < 5; i++) if (next.levels[i] !== prev.levels[i]) return true;
  return false;
}

export interface GroundedEvent {
  /** The new event, ready for the caller to persist into SessionEventLog.events. */
  readonly event: SessionEvent;
  /** True when this tick crossed a Measure+ rollover — persist durably (#time). */
  readonly checkpoint: boolean;
}

/**
 * Construct-on-first-event + grounding-tick + build the SessionEvent — PURE. The
 * caller persists `event` into the log (the LarDoc write path) and MAY use
 * `checkpoint` to choose durable-vs-ephemeral placement. The clock keys on `handle`.
 */
export function groundWorldlineEvent(
  log: SessionEventLog,
  handle: string,
  eventId: string,
  tickCounter: LarTickCounter,
  kind: string,
  payload: unknown,
  bounds?: FfzLevel,
): GroundedEvent {
  const prev = worldlineClockFor(log, handle, bounds);
  const clock = groundingTick(prev);
  const event: SessionEvent = { id: eventId, clock, tickCounter, kind, payload };
  return { event, checkpoint: isCheckpoint(prev, clock) };
}
