/**
 * anergy-ledger — negative marks bind to the RETIRED key as anergy (tolerated-inert, never a tombstone,
 * never laundered). The recovery keel's negative half (Repwright): a recovery INHERITS the retired key's
 * marks onto the fresh key, PRESERVING their decay clock — so a recovered veil re-presents no cleaner
 * than the retired one would have. Recovery restores the seat + earned standing, never a clean slate.
 *
 * Anergy is NOT a ban (immune-read): a mark is tolerated-inert and re-presents clean once its lease
 * decays (the danger passed). Inheritance keeps the age/hold so the fresh key hits `rePresents` at the
 * retired key's decay point — the recovery buys NO forgiveness the retired key had not already earned
 * by time. The negative follows the SUBJECT, never the key it was earned against.
 */

import { rePresents } from "./immune-read.js";

/** A negative mark bound to a retired key — tolerated-inert, decaying, never deleted. */
export interface AnergyMark {
  /** The key this mark is bound to — its address. Immutable origin; inheritance rebinds the carried copy. */
  readonly retiredKeyHex: string;
  /** Remaining hold before it re-presents clean (immune-read.rePresents semantics). */
  readonly holdTicks: number;
  /** Decay accrued so far — CARRIED across a recovery, never reset. */
  readonly ageTicks: number;
  /** The danger-model context that anergized it (immune-read). */
  readonly reason: string;
  /** The key this mark ORIGINALLY bound to, preserved across inheritance as provenance (never laundered). */
  readonly originKeyHex: string;
}

/** The retired key's negative record — content-addressed by key, append-only, never laundered. A
 *  recovery READS this (it is not the caller's to supply — that is the clean-slate guard, recovery-seat). */
export interface AnergyLedger {
  marksFor(retiredKeyHex: string): readonly AnergyMark[];
}

/**
 * INHERIT, not reset: rebind the retired key's marks onto the fresh key, PRESERVING age/hold so the
 * fresh key presents no cleaner than the retired one. The origin key is preserved as provenance; decay
 * continues on the same clock (never restarts). This is the anergy-not-ban rule carried across recovery.
 */
export function inheritAnergy(marks: readonly AnergyMark[], freshKeyHex: string): AnergyMark[] {
  return marks.map((m) => ({
    ...m,
    retiredKeyHex: freshKeyHex,                     // rebind the ADDRESS to the fresh key
    originKeyHex:  m.originKeyHex ?? m.retiredKeyHex, // preserve the true origin (never laundered)
    // ageTicks + holdTicks carry UNCHANGED — the decay clock never resets on recovery.
  }));
}

/** Does a mark still HOLD (not yet decayed to re-presentable-clean)? Reads the CARRIED age/hold. */
export function markStillHolds(m: AnergyMark): boolean {
  return !rePresents(m.ageTicks, m.holdTicks);
}
