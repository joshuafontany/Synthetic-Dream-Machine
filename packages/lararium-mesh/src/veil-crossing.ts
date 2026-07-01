/**
 * veil-crossing — the promote gesture on the veil: crossing from anon (veiled) into a
 * named PersonaGroup is a CHOICE the vessel makes per crossing (operator's recorded design,
 * mempalace planning talk-story):
 *
 *   · LIFT — keep the anon key, link it, BRING THE REPUTATION. Linkable: the anon key IS
 *     the persona key, so the anon past WELDS to the persona (every observer who watched
 *     the anon key can now stitch "that anon = this persona"). Right for own-devices /
 *     momentary-anon; the reputation carries.
 *   · HOLD — REFOUND: present a FRESH key at a NEW hardened path, with NO back-link. The
 *     anon footprint has nothing to weld to. Right for a lived-public anon that wants to
 *     enter a private persona WITHOUT dragging its public history in.
 *
 * This is the crucible's owed cross-place unlinkability + the canon's Chaum move
 * (persona-circle#disclosure: "graduate by transferring a credential to a fresh
 * pseudonym, never by proving sameness, so the veil can re-close on a new key").
 *
 * WHAT "severed" MEANS, precisely (crucible-scoped): HOLD severs the PUBLIC link — a
 * wire-watcher cannot derive/stitch the refound key from the anon key, because all-hardened
 * SLIP-0010 derivation is immune to public cross-path linkage (persona-hd, 28/28 vectors),
 * and the refound reuses NO key (no signature-reuse linker). The SEED holder (you) still
 * knows both — severance is against the observer, not against yourself. The ZK-vouch that
 * lets a refound carry "blessed by someone who knew the anon" WITHOUT a public link stays
 * the adjacent arc (deferred, operator's future).
 *
 * Platform-blind: rides ./persona-identity only. NO node: imports.
 * Meme: lar:///ha.ka.ba/@lares/api/pono/persona-circle
 */

import { deriveVeiledUserKey, type PersonaPath } from "./persona-identity.js";

export type VeilCrossing = "lift" | "hold";

/** The persona presented after a veil crossing. */
export interface CrossedVeil {
  readonly mode: VeilCrossing;
  /** The persona verifying key presented — the anon key (lift) or a fresh key (hold). */
  readonly verifyingKey: string;
  /** Where it derived — the anon path (lift) or a fresh path (hold). */
  readonly path: PersonaPath;
  /** Does the anon past weld to this persona? lift = true (linkable), hold = false (severed). */
  readonly linkedToAnon: boolean;
  /** The petname surfaced for this crossing (a known handle is a disclosure act). */
  readonly petname?: string;
}

export interface CrossVeilOpts {
  readonly petname?: string;
  /** HOLD only — the fresh handle index (default: anon.handleIndex + 1). */
  readonly newHandleIndex?: number;
  /** HOLD only — the fresh context index (default: 0). */
  readonly newContextIndex?: number;
}

/**
 * Cross the veil from an anon persona into a named one, LIFTING (keep-key, weld) or
 * HOLDING (refound, sever). Pure over the persona seed + the all-hardened derivation.
 */
export async function crossVeil(
  seed: Uint8Array,
  anon: PersonaPath,
  mode: VeilCrossing,
  opts: CrossVeilOpts = {},
): Promise<CrossedVeil> {
  if (mode === "lift") {
    // Keep the anon key — the reputation carries, the anon past WELDS (same key = linkable).
    const kp = await deriveVeiledUserKey(seed, anon.handleIndex, anon.contextIndex);
    const crossed: CrossedVeil = { mode, verifyingKey: kp.verifyingKey, path: anon, linkedToAnon: true };
    return opts.petname !== undefined ? { ...crossed, petname: opts.petname } : crossed;
  }
  // HOLD: refound at a FRESH hardened path — no back-link a public observer can follow.
  const path: PersonaPath = {
    handleIndex: opts.newHandleIndex ?? anon.handleIndex + 1,
    contextIndex: opts.newContextIndex ?? 0,
  };
  const kp = await deriveVeiledUserKey(seed, path.handleIndex, path.contextIndex);
  const crossed: CrossedVeil = { mode, verifyingKey: kp.verifyingKey, path, linkedToAnon: false };
  return opts.petname !== undefined ? { ...crossed, petname: opts.petname } : crossed;
}

/**
 * Does the crossed persona's key equal the anon key? — the PUBLIC-linkability check a
 * wire-watcher can run. LIFT welds (true); HOLD severs (false).
 */
export function weldsToAnon(anonVerifyingKey: string, crossed: CrossedVeil): boolean {
  return crossed.verifyingKey === anonVerifyingKey;
}
