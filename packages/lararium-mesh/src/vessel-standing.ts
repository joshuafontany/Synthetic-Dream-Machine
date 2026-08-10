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

// ── THE WAKING FLOOR — what a vessel stands as when its archive will not open ──────────────────────────

/** Why a vessel stands as it does. Named, because "herm" alone hides whether anyone chose it. */
export type StandingReason =
  | "as-asked"             // the recipe named this class and nothing overrode it
  | "archive-sealed-shut"; // a hearth was asked for; its archive holds shut, so it stands at the floor

/** What a vessel stands as, and why. */
export interface VesselStanding {
  readonly cls:    VesselClass;
  readonly reason: StandingReason;
}

/**
 * standAs — every node stands first as a Herm; an operator lights the hearth fire.
 *
 * ── THE FLOOR IS THE HARDENED STATE, NOT A DEGRADE ──────────────────────────────────────────────────────
 * A vessel whose archive holds shut has lost its CAPS, never its FLOOR: it carries, it serves the public
 * shelf, and it holds every sovereign act closed. Calling that "degraded" reads the safety backwards and
 * biases an operator toward rushing the raise — the field already learned this and inverted our first
 * vocabulary (Android's Direct Boot ships the same shape, and forensics treats before-first-unlock as the
 * HARDENED state, after-first-unlock as the liability).
 *
 * So this never lowers anything. A vessel that cannot open simply never rose, and an operator supplying the
 * key raises it. Nobody exercises a lowering act, here or anywhere in this house.
 *
 * ── AND THE RAISE BELONGS TO THIS LAYER ALONE ───────────────────────────────────────────────────────────
 * Opening a vessel's own archive is the act of whoever holds that vessel's opening secret — never a kahu
 * quorum. The founding order proves it: a kahu cabal is seated FROM declared Handles, which stand on an
 * already-raised lararium, so a raise that waited on a quorum could never found the first Nexus at all. A
 * quorum's acts belong one layer out (the antigen, carriage contracts, the seal lineage) and reach no
 * vessel's archive — a share-holder would become the collector the vault exists to refuse.
 *
 * Canon: lar:///ha.ka.ba/lares/api/pono/waking-floor
 */
export function standAs(asked: VesselClass, archiveOpens: boolean): VesselStanding {
  // A Herm holds no persona by law, so nothing about it waits on a raise — it stands as asked, always.
  if (asked === "herm")  return { cls: "herm", reason: "as-asked" };
  if (archiveOpens)      return { cls: asked,  reason: "as-asked" };
  return { cls: "herm", reason: "archive-sealed-shut" };
}

/** Whether this standing came from a shut archive rather than from the recipe — what an announcement says. */
export function standsAtFloor(st: VesselStanding): boolean {
  return st.reason === "archive-sealed-shut";
}
