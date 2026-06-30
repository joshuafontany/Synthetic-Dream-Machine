/**
 * me-circle — the "me" as a SINGLE-PRINCIPAL PLACE: a place in l-space where a human's
 * multiple Personas (handle-Circles / PersonaGroups) OVERLAP, where ONE Persona takes
 * the blame at a time, and which the embodied human carries through space-time with
 * itself (body + environment).
 *
 * Operator's ruling (2026-06-30, myth-as-spec): a "me" composes as a single-principal
 * cabal-place — the SAME place machinery (cabal-place.ts), with the multi-principal
 * complexity DEGENERATE to trivial because there is ONE ordering authority: you.
 *   · COMPOSITION (Circle = who is me) ⊥ the optional shared substrate (the place).
 *   · The cabal-place tie-break (BeeKEM blank-on-merge) orders CONCURRENT DIFFERENT-
 *     principal ops — a me-place has no different principals, so it never engages.
 *   · The capture-clock detects a minority out-feeding a majority — you cannot capture
 *     your OWN me, so a me-place is capture-immune by construction.
 *   · The legitimacy gate (persistence≠legitimacy) dissolves — there is no contested
 *     authority to be legitimate ABOUT.
 * So the "me" reuses the cabal-place keel with the hard parts collapsed to nothing.
 * This module proves that degeneracy is load-bearing (test it with the infrastructure).
 *
 * "One Persona at a time takes the blame" — at any moment EXACTLY ONE PersonaGroup is
 * ACTIVE / accountable (the Voice-house pattern: one Voice surfaces, named). Switching
 * is FREE — single-principal, you are the authority over your own slices.
 *
 * The DISCLOSURE dial rides per-persona (composition⊥disclosure): a constellation
 * persona may sit VEILED (no petname) or KNOWN (a petname surfaced for that
 * PersonaGroup — the slice-of-human, never the human). The me-Circle itself is the
 * human's private constellation: NO global self, disclosed edge-by-edge.
 *
 * Platform-blind: rides ./cabal-place only. NO node: imports.
 *
 * Meme: lar:///ha.ka.ba/@lares/api/pono/persona-circle
 */

import type { CabalPlace } from "./cabal-place.js";

/**
 * A persona in the me-constellation — a handle-Circle (PersonaGroup) the human holds,
 * overlapping in the me-place. The petname is the DISCLOSURE pole: present = known
 * (surfaced for this slice-of-human), absent = veiled (name⊥).
 */
export interface ConstellationPersona {
  /** The PersonaGroup's handle/DID, hex — its content-addressed identity in the constellation. */
  readonly handleHex: string;
  /** The petname surfaced for THIS PersonaGroup (the slice, never the human). Absent = veiled. */
  readonly petname?: string;
}

/**
 * The "me" — a single-principal place where the human's personas overlap. Wraps a
 * cabal-place (the shared substrate the personas overlap in) and adds the constellation
 * + the one-at-a-time accountability + the single ordering authority.
 */
export interface MeCircle {
  /** The shared substrate the personas overlap in — a cabal-place, single-principal. */
  readonly mePlace: CabalPlace;
  /** The ONE ordering authority — the human's me-key, hex. Every persona answers to it. */
  readonly principalHex: string;
  /** The overlapping personas (handle-Circles). The closure of the human's constellation. */
  readonly constellation: readonly ConstellationPersona[];
  /** Who "takes the blame" right now — the active persona's handle. null only when empty. */
  readonly activeHandleHex: string | null;
}

/** Found an empty me-Circle over a single-principal place. Born with no personas, none active. */
export function foundMeCircle(mePlace: CabalPlace, principalHex: string): MeCircle {
  return { mePlace, principalHex, constellation: [], activeHandleHex: null };
}

/**
 * CONTRACT a persona into the me — "multiple known users (PersonaGroups) contract
 * together as a me." Adds the handle-Circle to the constellation (idempotent on
 * handleHex; a re-contract updates the petname — turning the disclosure dial). The
 * FIRST persona contracted becomes active by default (someone must take the blame).
 *
 * Single-principal: no tie-break, no admission gate — you are the authority over your
 * own slices, so contracting is your free act. (A MULTI-principal place would route
 * this through the Keyhive ceremony + the inert gate; a me does not.)
 */
export function contractPersona(me: MeCircle, persona: ConstellationPersona): MeCircle {
  const rest = me.constellation.filter((p) => p.handleHex !== persona.handleHex);
  const constellation = [...rest, persona];
  const activeHandleHex = me.activeHandleHex ?? persona.handleHex;   // first one takes the blame
  return { ...me, constellation, activeHandleHex };
}

/**
 * RELEASE a persona from the constellation (kāpae — remove-wins). If the released
 * persona held the blame, the blame passes to the next remaining persona (or null when
 * the constellation empties). Single-principal: your own act, no convergent-removal
 * ceremony needed.
 */
export function releasePersona(me: MeCircle, handleHex: string): MeCircle {
  const constellation = me.constellation.filter((p) => p.handleHex !== handleHex);
  const activeHandleHex =
    me.activeHandleHex === handleHex
      ? (constellation[0]?.handleHex ?? null)        // the blame passes on
      : me.activeHandleHex;
  return { ...me, constellation, activeHandleHex };
}

/** The persona currently accountable — "one Persona at a time takes the blame." null when empty. */
export function activePersona(me: MeCircle): ConstellationPersona | null {
  return me.constellation.find((p) => p.handleHex === me.activeHandleHex) ?? null;
}

/**
 * SWITCH which persona takes the blame — surface a different slice. FREE, single-
 * principal (you choose which of your own faces speaks). FAIL-LOUD: switching to a
 * handle NOT in the constellation throws — a designation must carry its authority, never
 * resolve to an absent slice (the confused-deputy guard).
 */
export function withActivePersona(me: MeCircle, handleHex: string): MeCircle {
  if (!me.constellation.some((p) => p.handleHex === handleHex)) {
    throw new Error(`me-circle: cannot take the blame as an un-contracted persona (${handleHex})`);
  }
  return { ...me, activeHandleHex: handleHex };
}

/**
 * THE SINGLE-PRINCIPAL DEGENERACY — the load-bearing claim. A me-place needs NONE of
 * the cabal-place's multi-principal machinery, because every persona answers to the one
 * principal:
 *   · tieBreakEngaged   — false: no concurrent DIFFERENT-principal ops to order.
 *   · captureImmune     — true:  you cannot out-maintain (capture) your own me.
 *   · legitimacyContested — false: no contested authority to adjudicate.
 * If any of these read otherwise for a structurally-single-principal me, the ruling
 * does NOT hold and the model strains (surface it, do not paper over).
 */
export interface MeCircleDegeneracy {
  readonly tieBreakEngaged:     boolean;
  readonly captureImmune:       boolean;
  readonly legitimacyContested: boolean;
}

export function meCircleDegeneracy(_me: MeCircle): MeCircleDegeneracy {
  // Single-principal by construction (the ceremony contracts only the one human's own
  // PersonaGroups under principalHex). The multi-principal machinery collapses:
  return { tieBreakEngaged: false, captureImmune: true, legitimacyContested: false };
}
