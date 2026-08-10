/**
 * vessel-standing — HOW a vessel comes to stand, and how many faces it may hold.
 *
 * Two questions one model answers, because they turn out to be the same question asked twice: a vessel that
 * may hold no human face also cannot self-sign its own founding, and a vessel that self-signs its founding
 * necessarily holds one.
 *
 * ── THE TWO FOUNDING MODES ───────────────────────────────────────────────────────────────────────────────
 * SELF-STOOD — the vessel MINTS a persona root and signs its own device-delegation with it. A human's own
 * hearth or leaf: they stand present, they hold their own face, they bind their own device.
 *
 * CONTRACTED — the vessel mints NO root. A trusted operator, already contracted with the kahu, signs the
 * device-delegation ELSEWHERE and the vessel carries only the EDGE. This enacts bind-by-edge in its purest case:
 * such a vessel cannot cheat by holding a seed, because it never holds one.
 *
 * A Herm stands CONTRACTED, always, and that holds as law rather than as setting. A crossroads holds no local
 * human keys to steal — so its legitimacy runs kahu quorum → the operator's carriage contract → the
 * operator's persona root signing its edge, and it holds a Place DID and nothing of anybody's person.
 *
 * ── WHY THE SLOT CEILING IS PART OF THE SAME ANSWER ──────────────────────────────────────────────────────
 * The Herm's ceiling reads 0 STRUCTURALLY: no dial raises it, because raising it would put a human's key on
 * a crossroads, the one thing the class exists to prevent. Every other class carries an operator
 * DIAL — a human holds a multitude, and the code has no business deciding how large a multitude may be.
 *
 * The default bounds a device that has not been told otherwise; it bounds OPERATION (each root
 * implies a vault slot, a KEL, and sync traffic), never a legitimacy signal, so unlike the admission dials
 * it may safely carry one. Raising it rides an operator turn; it can never raise a Herm.
 *
 * Platform-blind: rides ./persona-vault's index ceiling only. NO node: imports.
 * Meme: lar:///ha.ka.ba/lararium/mesh/identity-classes
 */

import { HANDLE_INDEX_CEILING } from "./persona-vault.js";

/**
 * What a vessel stands AS. Not a device type — a hearth and a leaf differ by device-gated caps, never by
 * class, and both hold human faces. The Herm holds the one genuinely distinct standing: faceless by law.
 */
export type VesselClass = "hearth" | "leaf" | "herm";

/** How a vessel came to stand — see the header; a Herm always stands `contracted`. */
export type FoundingMode = "self-stood" | "contracted";

/**
 * The founding mode a class MUST use. A Herm cannot self-stand (it would have to mint the very root its
 * class forbids); a hearth or leaf may do either — a leaf admitted into an existing fleet stands contracted,
 * a fresh hearth stands self-stood — so this names the herm's law and leaves the rest to the caller.
 */
export function requiredFoundingMode(cls: VesselClass): FoundingMode | null {
  return cls === "herm" ? "contracted" : null;
}

/**
 * The operational default when no operator has turned the dial. Small on purpose: a human who wants more
 * faces says so, and a device nobody configured should not carry an unbounded vault.
 */
export const DEFAULT_PERSONA_SLOT_CEILING = 8;

/**
 * How many persona roots this vessel may hold.
 *
 * A HERM READS 0 AND NO ARGUMENT CHANGES IT — the ceiling IGNORES its argument rather than clamping it, because
 * a clamp invites the reading that a large enough number would win. Nothing wins: the class stands faceless.
 *
 * Every other class reads the operator's declared ceiling, or the default when they have declared none. A
 * torn or nonsensical declaration falls back to the default rather than to zero: a mis-typed config must not
 * silently lock a human out of their own faces (that failure grants no safety, it locks a human out).
 */
export function personaSlotCeiling(cls: VesselClass, declaredCeiling?: number): number {
  if (cls === "herm") return 0;
  if (declaredCeiling === undefined) return DEFAULT_PERSONA_SLOT_CEILING;
  if (!Number.isSafeInteger(declaredCeiling) || declaredCeiling < 1) return DEFAULT_PERSONA_SLOT_CEILING;
  return Math.min(declaredCeiling, HANDLE_INDEX_CEILING);   // never past the derivation's own range
}

/** True when this vessel may stand a persona root at `handleIndex`. A Herm refuses every index. */
export function permitsPersonaSlot(cls: VesselClass, handleIndex: number, declaredCeiling?: number): boolean {
  if (!Number.isSafeInteger(handleIndex) || handleIndex < 0) return false;
  return handleIndex < personaSlotCeiling(cls, declaredCeiling);
}

/** Why a vessel refused to stand a face — named, so a human learns what would change the answer. */
export type SlotRefusal =
  | "faceless-by-class"   // a Herm: no dial raises this, and none should
  | "past-ceiling";       // the operator's own ceiling, raisable by the operator

/** Null when the slot stands; otherwise the named refusal. */
export function refuseSlot(cls: VesselClass, handleIndex: number, declaredCeiling?: number): SlotRefusal | null {
  if (cls === "herm") return "faceless-by-class";
  return permitsPersonaSlot(cls, handleIndex, declaredCeiling) ? null : "past-ceiling";
}

// ── THE WAKING FLOOR — one floor, and caps that arrive by recognition ──────────────────────────────────

/**
 * standAs — every vessel stands first at the FLOOR; caps arrive afterward, by recognition.
 *
 * ── ONE FLOOR, NOT TWO KINDS OF HERM ────────────────────────────────────────────────────────────────────
 * A crossroads nobody has raised and a hearth whose archive holds shut stand in the SAME state, and naming
 * them apart would freeze a difference that does not survive contact: any vessel at the floor may be raised
 * when someone who can raise it arrives. A wayside herm gets a building raised over it and a hearth fire lit
 * when somebody comes to dwell; the marker was never a different KIND of thing from the house.
 *
 * ── THE FLOOR IS THE HARDENED STATE ─────────────────────────────────────────────────────────────────────
 * A vessel here has lost its CAPS, never its FLOOR: it carries, it serves the public shelf, and it holds
 * every sovereign act closed. Calling that "degraded" reads the safety backwards — the field inverted our
 * first vocabulary (Android's Direct Boot ships this shape; forensics treats before-first-unlock as the
 * HARDENED state and after-first-unlock as the liability, and Google now FORCES the return).
 *
 * So nothing is ever lowered. A vessel that cannot open simply never rose, and a raise that stops being
 * renewed simply stops standing — no party exercises a lowering act, here or anywhere in this house.
 *
 * ── AND THE CEILING LAW SURVIVES THE RAISE, WHICH IS WHY BOTH CAN HOLD ──────────────────────────────────
 * `personaSlotCeiling("herm") === 0` bars a SEATED persona root — a human's key resting on a crossroads,
 * the one thing the class exists to prevent. A raise puts no key there: caps arrive WITH a recognised
 * operator, ride their own keys, and leave when the recognition stops being renewed. The vessel's at-rest
 * state never changes, so a stolen disk still yields nothing of anybody's person.
 *
 * SEATED ⊥ RAISED. The first is storage and stays barred; the second is presence and stays welcome.
 *
 * Canon: lar:///ha.ka.ba/lares/api/pono/waking-floor
 */
export function standAs(asked: VesselClass, archiveOpens: boolean): VesselClass {
  // A hearth that cannot open its archive stands where every unraised vessel stands — at the floor.
  return archiveOpens ? asked : "herm";
}

// ── THE RAISE — caps arrive by recognition, and end by SUPERSESSION ────────────────────────────────────

/** A raise standing over a vessel: who was recognised, and under which fencing epoch. */
export interface RaisedCaps {
  /** The recogniser whose presence carries these caps. Their keys, never the vessel's. */
  readonly byNym: string;
  /** The corm epoch this raise was issued under — a FENCING TOKEN, never a timer. */
  readonly epoch: number;
}

/**
 * Whether a raise still stands, read against the vessel's own high-water epoch.
 *
 * ── NO DURATION, NO CLOCK, NO GLOBAL NOW ────────────────────────────────────────────────────────────────
 * A first draft of this took a wall-clock `now` and an interval, and that form is the one the house forbids:
 * two islands with different clocks disagree about whether a raise stands, and a vessel AT THE FLOOR holds
 * no trustworthy wall time at all — precisely the vessel this law governs.
 *
 * So expiry reads as SUPERSESSION — "a higher epoch exists downstream of me" — never as "a duration
 * elapsed". The guarded resource holds its highest-admitted epoch and refuses anything beneath it, so a
 * paused, forwarded or replayed raise self-revokes the instant a higher epoch touches the vessel. No global
 * broadcast, no clock, and a returning holder stays fenced whether or not anyone suspected it.
 *
 * ── AND THE ENDING RIDES A SECOND WIRE, DELIBERATELY NOT FOLDED IN HERE ──────────────────────────────────
 * Deciding "stop waiting for a renewal" cannot be done from safety alone — under asynchrony nothing tells a
 * slow recogniser from a departed one. That decision belongs to the LIVENESS wire: local, monotone,
 * suspicion-accruing, never leaving its island as a timestamp anyone else must agree on. It feeds SUSPICION
 * and never ordering, and acting on a wrong suspicion stays safe because this fence still holds.
 *
 * Fusing the two wires is how a global now gets smuggled back in. They stay apart.
 *
 * Canon: lar:///ha.ka.ba/lares/api/pono/waking-floor · the clockless lease model (safety ⊥ liveness)
 */
export function raiseStands(raise: RaisedCaps | null, highestAdmittedEpoch: number): boolean {
  if (!raise) return false;
  if (!Number.isSafeInteger(raise.epoch) || !Number.isSafeInteger(highestAdmittedEpoch)) return false;
  return raise.epoch >= highestAdmittedEpoch;   // superseded the moment a higher epoch lands
}

/** The caps a vessel carries under its current fence — its floor, plus any raise not yet superseded. */
export function standingClass(floor: VesselClass, raise: RaisedCaps | null, highestAdmittedEpoch: number): VesselClass {
  return raiseStands(raise, highestAdmittedEpoch) ? "hearth" : floor;
}
