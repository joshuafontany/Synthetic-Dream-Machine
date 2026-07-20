/**
 * nexus-charter-seed — the DATA seed for the founding kahu quorum (operator-ruled 2026-07-20). This is a
 * config seed, NOT library logic: `kapae-antigen`'s pure fold/verify take a `KahuCharterRoster` as a
 * parameter, and this file names the ONE concrete roster the founding Nexus seats. It carries the three
 * founding PersonaGroups + a 2-of-3 threshold, and it FAILS CLOSED until the operator binds real keys.
 *
 * THE FOUNDING QUORUM — three founding kahu cryptographic-individuals (persona-policy: each PersonaGroup
 * a cryptographic individual), 2-of-3:
 *   · "Guru Joshua Fontany"
 *   · "Telarus, KSC"
 *   · "The Lindwyrm"
 *
 * KEYS UNBOUND BY DESIGN. A kahu's ed25519 verifying key is that PersonaGroup's own root-derived key —
 * it MUST be seated by the operator, never invented here. With keys unbound, `foundingRoster` yields an
 * empty key-set: any threshold ≥ 1 fails, so the multi-sig verifier IGNORES every antigen entry until
 * the operator seats the real keys. That is the correct fail-closed floor — the immune system stays
 * inert (never allow-all) until the founding quorum is cryptographically real.
 *
 * SURFACED FORK (placement): this seats the roster as a typed CODE seed. The operator MAY instead prefer
 * a bags/@nexus charter DOC (data the wax-stamp epoch-chain roots on) as the authority home; the pure
 * library consumes a `KahuCharterRoster` either way, so this seam moves without touching antigen logic.
 *
 * Platform-blind: rides ./kapae-antigen types only. NO node: imports.
 * Meme: lar:///ha.ka.ba/lararium/mesh/carry-contract#the-honest-edges
 */

import type { KahuCharterRoster } from "./kapae-antigen.js";

/** One founding kahu — a display name + its ed25519 verifying key (UNBOUND until the operator seats it). */
export interface FoundingKahu {
  readonly displayName:  string;
  /** The PersonaGroup's ed25519 verifying-key hex, or null while unseated (the fail-closed floor). */
  readonly verifyingKey: string | null;
}

/** The three founding kahu PersonaGroups (operator-ruled). Keys UNBOUND — the operator seats each one. */
export const FOUNDING_KAHU: readonly FoundingKahu[] = [
  { displayName: "Guru Joshua Fontany", verifyingKey: null },
  { displayName: "Telarus, KSC",        verifyingKey: null },
  { displayName: "The Lindwyrm",        verifyingKey: null },
];

/** k — the founding threshold. 2 of the 3 founding kahu sign a valid antigen (ban/lift) act. */
export const FOUNDING_QUORUM_THRESHOLD = 2 as const;

/**
 * Build the founding `KahuCharterRoster` for a given charter epoch. Filters to SEATED keys only, so an
 * unseated founding set yields an empty roster that FAILS CLOSED (the verifier ignores every entry). Pass
 * the nexus-charter epoch's `epochCid` (the wax-stamp epoch the antigen roots on).
 */
export function foundingRoster(charterEpochCid: string): KahuCharterRoster {
  const keys = FOUNDING_KAHU
    .map((k) => k.verifyingKey)
    .filter((k): k is string => typeof k === "string" && k.length > 0);
  return { keys, threshold: FOUNDING_QUORUM_THRESHOLD, charterEpochCid };
}

/** Does the founding roster carry enough SEATED keys to raise a valid quorum? False while keys stay unbound. */
export function foundingQuorumSeated(): boolean {
  const seated = FOUNDING_KAHU.filter((k) => typeof k.verifyingKey === "string" && k.verifyingKey.length > 0);
  return seated.length >= FOUNDING_QUORUM_THRESHOLD;
}
