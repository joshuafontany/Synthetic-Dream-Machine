/**
 * mu-void — the ONE indistinguishable response the carry seam draws for BOTH "you are caught up"
 * (sync-complete) AND "you are Kapae'd" (denied). Information-minimal by construction: an adversary
 * reading the wire cannot tell nothing-more-to-extract from nothing-more-permitted, because the two
 * paths return BYTE-IDENTICAL Mu (RAW's Chapel-Perilous exit — unasked, void, next question).
 *
 * A Kapae'd presenter draws Mu, NEVER a denial: a denial leaks information (it confirms the ban, names
 * the antigen, opens an argument surface). Mu closes the surveillance seam at the same stroke it closes
 * the immune one. This module is the wire-level artifact of that indistinguishability + the seam a test
 * pins byte-for-byte (mu-void.test.ts).
 *
 * Platform-blind: rides ./crypto only. NO node: imports.
 * Meme: lar:///ha.ka.ba/lararium/mesh/carry-contract#kapae-the-antigen
 */

import { canonicalJson, canonicalJsonBytes } from "./crypto.js";

/** The domain of the void — a stable tag so a reader parses Mu without inferring intent from shape. */
export const MU_VOID_DOMAIN = "lar-mu/v1" as const;

/** The void itself — carries NOTHING but its domain. No reason, no target, no confession rides here. */
export interface MuVoid {
  readonly kind: typeof MU_VOID_DOMAIN;
}

/** Why the seam drew Mu — an INTERNAL discriminant only; it NEVER reaches the wire (that is the point). */
export type MuReason = "sync-complete" | "kapae-denied";

/** Mint the void — one frozen value, so every draw is the SAME void whatever the internal reason. */
export function muVoid(): MuVoid {
  return Object.freeze({ kind: MU_VOID_DOMAIN });
}

/** The void's canonical bytes — what actually crosses the wire. Both reasons MUST yield these bytes. */
export function muVoidBytes(): Uint8Array {
  return canonicalJsonBytes(muVoid());
}

/** The void's canonical JSON — the string form for a text seam. Both reasons MUST yield this string. */
export function muVoidJson(): string {
  return canonicalJson(muVoid());
}

/**
 * The carry seam's response — BOTH reasons collapse to one byte-identical void. The `_reason` conditions
 * NOTHING about the output; it rides only as an internal label so a call site reads self-documenting.
 * This is the indistinguishability, expressed as code: the branch on reason CANNOT alter the response.
 */
export function muResponse(_reason: MuReason): MuVoid {
  return muVoid();
}

/** The caught-up peer's void — nothing more to extract. Byte-identical to `kapaeDeniedVoid`. */
export function syncCompleteVoid(): MuVoid {
  return muResponse("sync-complete");
}

/** The Kapae'd presenter's void — nothing more permitted. Byte-identical to `syncCompleteVoid`. */
export function kapaeDeniedVoid(): MuVoid {
  return muResponse("kapae-denied");
}
