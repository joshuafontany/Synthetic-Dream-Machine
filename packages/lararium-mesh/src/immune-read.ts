/**
 * immune-read — the danger-model as code (Matzinger; swarm-confirmed). A defensive response
 * against an actor is licensed by CONTEXT — a bad signal-pattern corroborated by a neighbor —
 * NEVER by identity or persistence. The default is TOLERANCE; the response is ANERGY (the
 * veil disarmed but persisting, re-presentable at the anon floor after its lease decays),
 * NEVER a ban/delete. Per-vessel-veil; a standing, lossy process, never "solved".
 *
 * Two proven guards ride here:
 *   · TWO-SIGNAL costimulation — anergy fires only on the actor's OWN threat-signal (Signal-1)
 *     AND an INDEPENDENT neighbor's corroboration (Signal-2). One flag alone never anergizes —
 *     that is the guard against AUTOIMMUNITY (a single false accusation can't disarm a healthy
 *     veil).
 *   · CONTEXT, not identity — persistence≠legitimacy in the immune layer too: a pledged
 *     Handle is NOT immune. If its pattern reads threat and a neighbor corroborates, it
 *     anergizes exactly like a throwaway. Presence proves nothing; behavior-in-context licenses.
 *
 * The DIALS (what rate/flag count reads as threat, how long anergy holds) are the operator's
 * fairness settings — parameters here, never baked.
 *
 * Platform-blind: rides ./veil-ladder types only. NO node: imports.
 * Meme: lar:///ha.ka.ba/@lares/api/pono/the-veil-ladder
 */

import type { VeilRung } from "./veil-ladder.js";

/** The immune response — TOLERATE (act freely) or ANERGIZE (disarmed, persists). NEVER a ban. */
export type ImmuneResponse = "tolerate" | "anergize";

/** An actor's recent behavior — the signal-pattern the immune-read watches (never its identity). */
export interface SignalPattern {
  /** Earned reputation (context, not a licence — a high-rep Handle still anergizes on threat). */
  readonly rep: number;
  /** Actions per observation window — a spike reads as a threat (flood/spam). */
  readonly recentActionRate: number;
  /** Independent complaints/flags raised against this veil in the window. */
  readonly flags: number;
  /** The actor's rung — carried for context only; it NEVER auto-licenses (persistence≠legitimacy). */
  readonly rung: VeilRung;
}

/** The operator's fairness dials — what reads as threat, how long anergy holds. Parameters, not baked. */
export interface ImmuneDials {
  /** Flags at or above this read as a threat-signal. */
  readonly flagFloor: number;
  /** Action-rate at or above this reads as a threat-signal (flood). */
  readonly rateCeiling: number;
}

/**
 * Signal-1 — does the actor's OWN pattern read as a threat? Behavior in context, never
 * identity: a Handle with a clean pattern reads no threat; a Handle with a bad one does.
 */
export function readsAsThreat(p: SignalPattern, dials: ImmuneDials): boolean {
  return p.flags >= dials.flagFloor || p.recentActionRate >= dials.rateCeiling;
}

/** The two danger signals — the actor's own (Signal-1) and an independent neighbor's (Signal-2). */
export interface DangerReading {
  /** Signal-1: the actor's own behavior reads as a threat (readsAsThreat). */
  readonly selfSignal: boolean;
  /** Signal-2: an independent neighbor corroborates the threat (costimulation). */
  readonly neighborSignal: boolean;
}

/**
 * THE IMMUNE-READ — license a response by two-signal danger corroboration. Default TOLERANCE;
 * ANERGIZE only when the actor's own threat-signal AND an independent neighbor's flag BOTH
 * fire. One signal alone → tolerate (the autoimmunity guard). Never returns a ban.
 */
export function immuneRead(d: DangerReading): ImmuneResponse {
  return d.selfSignal && d.neighborSignal ? "anergize" : "tolerate";
}

/**
 * Compose the read from an actor's pattern + a neighbor's corroboration: derive Signal-1 from
 * the pattern (context, not identity) and take Signal-2 from the neighborhood.
 */
export function immuneReadPattern(p: SignalPattern, neighborCorroborates: boolean, dials: ImmuneDials): ImmuneResponse {
  return immuneRead({ selfSignal: readsAsThreat(p, dials), neighborSignal: neighborCorroborates });
}

/**
 * ANERGY IS NOT A BAN — an anergized veil persists and RE-PRESENTS as tolerated once its
 * lease decays (the danger having passed, the pattern having cooled). Given the anergy lease
 * age vs its hold, report whether the veil may re-present clean. anergy always returns.
 */
export function rePresents(anergyAgeTicks: number, anergyHoldTicks: number): boolean {
  return anergyAgeTicks >= anergyHoldTicks;
}
